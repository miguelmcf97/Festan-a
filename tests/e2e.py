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
    page.wait_for_selector("text=Você tem 3 de 3 mensagens"); page.wait_for_selector("text=em qual bairro", timeout=20000)
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
    # Agenda: data da festa aparece fechada; um toque bloqueia/libera um dia livre
    import datetime as _dt
    t0=_dt.date.today()
    for k in range(5):  # procura o mês da festa confirmada
        y,mo=t0.year+(t0.month-1+k)//12,(t0.month-1+k)%12+1
        page.goto(f"{B}/fornecedor/agenda?mes={y}-{mo:02d}")
        if page.get_by_role("link", name=re.compile("Fechada")).count(): break
    expect(page.get_by_role("link", name=re.compile("Fechada"))).to_have_count(1)
    free=page.get_by_role("button", name=re.compile(r"^Bloquear \d")).first; lbl=free.get_attribute("aria-label")
    free.click(); page.wait_for_selector("text=Data bloqueada na agenda")
    page.get_by_role("button", name=re.compile("^Liberar "+re.escape(lbl.replace("Bloquear ","")))).click(); page.wait_for_selector("text=Data liberada")
    d0=_dt.date.today()+_dt.timedelta(days=40)
    page.fill("#bf",d0.isoformat()); page.fill("#bt",(d0+_dt.timedelta(days=2)).isoformat()); page.get_by_role("button", name="Bloquear período").click(); page.wait_for_selector("text=3 datas bloqueadas")
    page.screenshot(path=f"{S}/11-agenda.png", full_page=True)
    # Perfil: uma única categoria (rádio) e serviço herda a categoria
    page.goto(f"{B}/fornecedor/perfil"); assert page.locator("input[name=categoryId]:checked").count()==1; assert page.locator("input[type=checkbox][name=categories]").count()==0
    assert page.locator("#sc").count()==0
    print("agenda e categoria única: OK")
    logout(page); login(page,"cliente@planfest.demo"); page.goto(opp.replace("/fornecedor/oportunidades/","/painel/solicitacoes/"))
    expect(page.get_by_text("Contato do fornecedor")).to_be_visible(); print("cliente vê contato liberado após confirmação")
    # Admin
    logout(page); login(page,"admin@planfest.demo")
    page.screenshot(path=f"{S}/08-admin.png", full_page=True)
    # Admin: abas por etapa, ordenadas pela data da solicitação
    page.goto(f"{B}/admin/fornecedores"); page.get_by_role("button", name=re.compile("^Aprovar")).first.click(); page.wait_for_selector("text=aprovado.")
    page.goto(f"{B}/admin/fornecedores?aba=verificar"); n_ver=page.get_by_role("button", name=re.compile("^Verificar")).count()
    page.get_by_role("button", name=re.compile("^Verificar")).first.click(); page.wait_for_selector("text=recebeu o selo de verificado")
    assert page.get_by_role("button", name=re.compile("^Verificar")).count()==n_ver-1
    page.goto(f"{B}/admin/fornecedores?aba=verificados"); page.get_by_role("button", name=re.compile("^Remover selo")).first.click(); page.wait_for_selector("text=Selo de verificado removido")
    page.goto(f"{B}/admin/fornecedores?aba=verificar&ordem=recentes"); page.screenshot(path=f"{S}/12-admin-fornecedores.png", full_page=True)
    dates=page.locator("tbody tr td:first-child p:first-child").all_inner_texts(); print("admin · datas (recentes primeiro):", dates[:3])
    # Admin: limite de mensagens da IA
    page.goto(f"{B}/admin"); expect(page.locator("#ai-limit")).to_have_value("3")
    for path in ["/admin/categorias","/admin/avaliacoes","/admin/usuarios","/admin/solicitacoes"]:
        r=page.goto(B+path); assert r.status==200, path
    # Idioma: alterna para inglês e volta
    page.goto(B); page.get_by_role("button", name="English").click(); page.wait_for_selector("text=Plan with AI")
    page.screenshot(path=f"{S}/13-home-en.png")
    page.goto(f"{B}/admin/fornecedores"); expect(page.get_by_role("heading", name="Vendors")).to_be_visible()
    page.get_by_role("button", name="Português").click(); page.wait_for_selector("text=Planejar com IA")
    # Limite de 3 mensagens (visitante novo)
    v=br.new_context(viewport={"width":1366,"height":900}, bypass_csp=True).new_page(); v.on("pageerror", lambda e: errors.append(str(e)))
    v.goto(f"{B}/planejar"); v.wait_for_selector("text=Você tem 3 de 3 mensagens")
    for i,txt in enumerate(["Aniversário para 40 pessoas na Tijuca", "Orçamento de R$ 5 mil", "Sem decoração"]):
        v.fill("#chat-input",txt); v.keyboard.press("Enter"); v.wait_for_selector(f"text=Você {'tem '+str(2-i)+' de 3' if i<2 else 'usou as 3'}", timeout=20000)
    v.wait_for_selector("text=Suas mensagens com a assistente acabaram"); assert v.locator("#chat-input").count()==0
    v.screenshot(path=f"{S}/14-limite-ia.png", full_page=True)
    r=v.request.post(f"{B}/api/ai/chat", data={"message":"mais uma"}); assert r.status==429 and r.json()["code"]=="AI_LIMIT", r.status
    print("limite de 3 mensagens: OK (4ª recusada com 429)")
    # Mobile
    m=br.new_context(viewport={"width":390,"height":844}, is_mobile=True).new_page()
    m.goto(B); m.screenshot(path=f"{S}/09-home-mobile.png", full_page=True)
    m.goto(f"{B}/fornecedores/casa-ventania-eventos"); m.screenshot(path=f"{S}/10-perfil-mobile.png", full_page=True)
    br.close()
print("JS errors:", errors or "nenhum")
print("E2E OK")
