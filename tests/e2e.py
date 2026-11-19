import re, sys
from playwright.sync_api import sync_playwright, expect
B="http://localhost:3000"; S="/home/claude/shots"
def login(page,email,nxt=""):
    page.goto(f"{B}/entrar"+(f"?next={nxt}" if nxt else ""))
    page.fill("#email",email); page.fill("#password","planfest123"); page.click("button[type=submit]")
    page.wait_for_load_state("networkidle")
def logout(page):
    page.context.clear_cookies()
errors=[]
with sync_playwright() as p:
    br=p.chromium.launch()
    ctx=br.new_context(viewport={"width":1366,"height":900}, bypass_csp=True); page=ctx.new_page()
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(B); page.screenshot(path=f"{S}/01-home.png", full_page=True)
    # Jornada IA (anônima)
    page.goto(f"{B}/planejar?q="+ "Quero fazer uma festa de aniversário infantil para 80 pessoas, no Rio de Janeiro, com orçamento de R$ 8.000. Quero brinquedos para crianças, churrasco, decoração e música.")
    page.wait_for_selector("text=em qual bairro", timeout=20000)
    page.fill("#chat-input","Jacarepaguá, dia 20/12. Ainda não tenho local"); page.keyboard.press("Enter")
    page.wait_for_selector("text=Montei um planejamento", timeout=20000)
    page.wait_for_timeout(500); page.screenshot(path=f"{S}/02-planejar.png", full_page=True)
    conv = re.search(r"c=([\w-]+)", page.url).group(1)
    btns=page.get_by_role("button", name=re.compile("Solicitar orçamento"))
    print("cards com botão:", btns.count())
    btns.nth(0).click(); btns.nth(1).click()
    page.get_by_role("button", name="Pedir orçamentos").click()
    expect(page.get_by_text("Para enviar as solicitações, entre")).to_be_visible()
    # login preserva a conversa (claimAnonymous)
    login(page,"cliente@planfest.demo", f"/planejar?c={conv}")
    print("após login:", page.url)
    page.wait_for_selector("text=Montei um planejamento")
    btns=page.get_by_role("button", name=re.compile("Solicitar orçamento"))
    btns.nth(0).click(); btns.nth(1).click()
    page.get_by_role("button", name="Pedir orçamentos").click()
    page.wait_for_function("document.querySelector('#qd-desc') && document.querySelector('#qd-desc').value.length > 10", timeout=10000)
    page.screenshot(path=f"{S}/03-dialogo-orcamento.png")
    page.get_by_role("button", name=re.compile("Enviar 2 solicitações")).click()
    page.wait_for_selector("text=solicitações enviadas", timeout=10000)
    page.goto(f"{B}/painel"); page.screenshot(path=f"{S}/04-painel-cliente.png", full_page=True)
    # Fornecedor responde a solicitação NOVA (seed) com proposta
    logout(page); login(page,"fornecedor@planfest.demo")
    page.screenshot(path=f"{S}/05-painel-fornecedor.png", full_page=True)
    page.locator("a[href^='/fornecedor/oportunidades/']").first.click(); page.wait_for_url("**/fornecedor/oportunidades/**")
    opp=page.url.split("?")[0]
    page.fill("#p-a","3.200"); page.fill("#p-d","Uso do espaço das 14h às 19h com área kids, limpeza e segurança."); page.fill("#p-i","Área kids\nLimpeza\n2 seguranças"); page.fill("#p-c","Sinal de 30% na reserva")
    page.get_by_role("button", name="Enviar proposta").click(); page.wait_for_selector("text=Proposta enviada ao cliente")
    page.screenshot(path=f"{S}/06-oportunidade.png", full_page=True)
    # Cliente aceita → reserva
    logout(page); login(page,"cliente@planfest.demo")
    page.goto(f"{B}/painel"); page.get_by_role("link", name=re.compile("Casa Ventania")).first.click(); page.wait_for_url("**/painel/solicitacoes/**")
    page.get_by_role("button", name="Aceitar proposta").click(); page.wait_for_selector("text=Proposta aceita. Agora o fornecedor")
    expect(page.get_by_text("não está confirmada")).to_be_visible()
    page.screenshot(path=f"{S}/07-reserva.png", full_page=True)
    # Fornecedor confirma → contratação
    logout(page); login(page,"fornecedor@planfest.demo"); page.goto(opp)
    page.get_by_role("button", name=re.compile("Confirmar contratação")).click(); page.wait_for_selector("text=Contratação confirmada! A data")
    logout(page); login(page,"cliente@planfest.demo"); page.goto(opp.replace("/fornecedor/oportunidades/","/painel/solicitacoes/"))
    expect(page.get_by_text("Contato do fornecedor")).to_be_visible(); print("cliente vê contato liberado após confirmação")
    # Admin
    logout(page); login(page,"admin@planfest.demo")
    page.screenshot(path=f"{S}/08-admin.png", full_page=True)
    page.goto(f"{B}/admin/fornecedores"); page.get_by_role("button", name="Aprovar").first.click(); page.wait_for_selector("text=Fornecedor atualizado")
    for path in ["/admin/categorias","/admin/avaliacoes","/admin/usuarios","/admin/solicitacoes"]:
        r=page.goto(B+path); assert r.status==200, path
    # Mobile
    m=br.new_context(viewport={"width":390,"height":844}, is_mobile=True).new_page()
    m.goto(B); m.screenshot(path=f"{S}/09-home-mobile.png", full_page=True)
    m.goto(f"{B}/fornecedores/casa-ventania-eventos"); m.screenshot(path=f"{S}/10-perfil-mobile.png", full_page=True)
    br.close()
print("JS errors:", errors or "nenhum")
print("E2E OK")
