(() => {
  const S = window.SITE || {};
  const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const celular = matchMedia("(max-width: 760px)").matches;


  /* ── Rolagem que toca o vídeo ─────────────────────────────────────────── */
  const cine = document.querySelector(".cine");
  const canvas = cine && cine.querySelector(".cine-canvas");
  if (cine && canvas && S.frames && S.frames.total) {
    const ctx = canvas.getContext("2d");
    const total = S.frames.total;
    const padrao = celular ? S.frames.mobile : S.frames.desktop;
    const src = (i) => padrao.replace("{n}", String(i + 1).padStart(4, "0"));
    const quadros = new Array(total);
    const momentos = [...cine.querySelectorAll(".momento")];
    let alvo = 0, atual = 0, desenhado = -1;

    const carregar = (i) => {
      if (quadros[i]) return quadros[i];
      const img = new Image();
      img.decoding = "async";
      img.src = src(i);
      img.onload = () => { if (Math.round(atual) === i || desenhado === -1) desenhar(i, true); };
      return (quadros[i] = img);
    };

    // Carrega em passadas (1 a cada 8, depois 1 a cada 4…) para cobrir o filme inteiro cedo
    carregar(0);
    if (!reduzir) {
      const fila = [];
      for (const passo of [8, 4, 2, 1]) for (let i = 0; i < total; i += passo) if (!fila.includes(i)) fila.push(i);
      let k = 0;
      const lote = () => { for (let n = 0; n < 6 && k < fila.length; n++) carregar(fila[k++]); if (k < fila.length) setTimeout(lote, 40); };
      lote();
    }

    const pronto = (i) => quadros[i] && quadros[i].complete && quadros[i].naturalWidth;
    const maisProximo = (i) => {
      for (let d = 0; d < total; d++) {
        if (pronto(i - d)) return i - d;
        if (pronto(i + d)) return i + d;
      }
      return -1;
    };

    const ajustar = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      desenhado = -1;
      desenhar(Math.round(atual), true);
    };

    function desenhar(i, forcar) {
      const j = maisProximo(i);
      if (j < 0 || (j === desenhado && !forcar)) return;
      const img = quadros[j];
      const cw = canvas.width, ch = canvas.height;
      if (celular) {
        // Amplia os quadros mobile para cobrir a tela e ancora a cena no topo.
        const escala = Math.max(cw / img.naturalWidth, ch / img.naturalHeight) * 1.06;
        const w = img.naturalWidth * escala, h = img.naturalHeight * escala;
        ctx.drawImage(img, (cw - w) / 2, 0, w, h);
      } else {
        const escala = Math.max(cw / img.naturalWidth, ch / img.naturalHeight); // "cover"
        const w = img.naturalWidth * escala, h = img.naturalHeight * escala;
        ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
      }
      desenhado = j;
    }

    const progresso = () => {
      const r = cine.getBoundingClientRect();
      const curso = cine.offsetHeight - innerHeight;
      return Math.min(1, Math.max(0, -r.top / (curso || 1)));
    };

    const atualizarMomentos = (p) => {
      for (const m of momentos) {
        const de = parseFloat(m.dataset.de || 0), ate = parseFloat(m.dataset.ate || 1);
        m.classList.toggle("ativo", p >= de && (p < ate || (ate >= 1 && p >= 1)));
      }
      cine.classList.toggle("andou", p > 0.02);
    };

    const quadro = () => {
      alvo = progresso() * (total - 1);
      atual += (alvo - atual) * 0.18; // suaviza: sensação de filme, não de slide
      if (Math.abs(alvo - atual) < 0.05) atual = alvo;
      desenhar(Math.round(atual));
      atualizarMomentos(atual / (total - 1));
      requestAnimationFrame(quadro);
    };

    addEventListener("resize", ajustar);
    ajustar();
    if (reduzir) atualizarMomentos(0);
    else requestAnimationFrame(quadro);
  }

  /* ── Parallax leve nas artes ──────────────────────────────────────────── */
  // Sem frames gerados, mantém os momentos sincronizados com a rolagem do pôster.
  if (cine && !(S.frames && S.frames.total)) {
    const momentosFallback = [...cine.querySelectorAll(".momento")];
    const atualizarFallback = () => {
      const curso = cine.offsetHeight - innerHeight;
      const progresso = Math.min(1, Math.max(0, -cine.getBoundingClientRect().top / (curso || 1)));
      for (const m of momentosFallback) {
        const de = parseFloat(m.dataset.de || 0), ate = parseFloat(m.dataset.ate || 1);
        m.classList.toggle("ativo", progresso >= de && (progresso < ate || (ate >= 1 && progresso >= 1)));
      }
      cine.classList.toggle("andou", progresso > 0.02);
      requestAnimationFrame(atualizarFallback);
    };
    requestAnimationFrame(atualizarFallback);
  }

  const artes = reduzir ? [] : [...document.querySelectorAll(".arte")];
  if (artes.length) {
    const mover = () => {
      for (const a of artes) {
        const r = a.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) continue;
        const c = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        a.style.transform = `translate3d(0, ${(c * -60).toFixed(1)}px, 0) scale(1.08)`;
      }
    };
    addEventListener("scroll", () => requestAnimationFrame(mover), { passive: true });
    mover();
  }

  /* ── Topo, revelar e ano ──────────────────────────────────────────────── */
  const topo = document.querySelector(".topo");
  const whats = document.querySelector(".whats");
  let formNaTela = false; // o botão flutuante se recolhe para não cobrir o "Enviar"
  const aoRolar = () => {
    topo && topo.classList.toggle("rolou", scrollY > 40);
    whats && whats.classList.toggle("visivel", scrollY > innerHeight * 0.6 && !formNaTela);
  };
  const blocoContato = document.querySelector("#contato");
  if (blocoContato) new IntersectionObserver(([e]) => { formNaTela = e.isIntersecting; aoRolar(); }).observe(blocoContato);
  addEventListener("scroll", aoRolar, { passive: true });
  aoRolar();

  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("visto"); io.unobserve(e.target); }
  }), { threshold: 0.18 });
  document.querySelectorAll(".revelar").forEach((el) => io.observe(el));
  document.querySelectorAll("[data-ano]").forEach((el) => (el.textContent = new Date().getFullYear()));

  const visor3d = document.querySelector("#equipamento-3d");
  const palco3d = document.querySelector(".moving-visual");
  const descricao3d = document.querySelector("#modelo-descricao");
  const consulta3d = document.querySelector(".moving-cta");
  const opcoesModelo = [...document.querySelectorAll(".modelo-opcao")];
  const movimentoReduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let trocaModeloAtual = 0;

  const animarVisor = (classe) => new Promise((resolve) => {
    if (classe === "modelo-fechando") palco3d.classList.remove("modelo-fechado");
    else palco3d.classList.add("modelo-fechado");
    palco3d.classList.remove("modelo-fechando", "modelo-abrindo");
    void palco3d.offsetWidth;
    let timer;
    const terminar = (evento) => {
      if (evento && evento.target !== palco3d) return;
      clearTimeout(timer);
      palco3d.removeEventListener("animationend", terminar);
      palco3d.classList.remove(classe);
      if (classe === "modelo-fechando") palco3d.classList.add("modelo-fechado");
      else palco3d.classList.remove("modelo-fechado");
      resolve();
    };
    palco3d.addEventListener("animationend", terminar);
    palco3d.classList.add(classe);
    timer = setTimeout(() => terminar(), classe === "modelo-fechando" ? 340 : 440);
  });

  const atualizarModeloSelecionado = (opcao) => {
    const nome = opcao.dataset.nome;
    visor3d.alt = opcao.dataset.alt;
    visor3d.setAttribute("aria-label", `Arraste para girar o ${nome} em 360 graus`);
    if (descricao3d) descricao3d.textContent = opcao.dataset.descricao;
    if (consulta3d) {
      const mensagem = `Olá! Quero consultar a locação do ${nome}.`;
      consulta3d.href = `https://wa.me/${String(S.whatsapp?.numero || "").replace(/\D/g, "")}?text=${encodeURIComponent(mensagem)}`;
      consulta3d.textContent = `Consultar ${nome}`;
    }
    opcoesModelo.forEach((item) => {
      const selecionado = item === opcao;
      item.classList.toggle("ativo", selecionado);
      item.setAttribute("aria-pressed", String(selecionado));
    });
  };

  const selecionarModelo = async (opcao, transicao = false) => {
    if (!visor3d || !opcao) return;
    const arquivo = opcao.dataset.arquivo;
    const atual = visor3d.getAttribute("src") || "";
    if (atual.endsWith(arquivo)) {
      atualizarModeloSelecionado(opcao);
      if (transicao && !movimentoReduzido) {
        await animarVisor("modelo-fechando");
        await animarVisor("modelo-abrindo");
      }
      return;
    }

    const idTroca = ++trocaModeloAtual;
    const animar = transicao && !movimentoReduzido;
    if (animar) await animarVisor("modelo-fechando");
    if (idTroca !== trocaModeloAtual) return;

    let carregamento = Promise.resolve();
    if (animar) {
      carregamento = new Promise((resolve) => {
        let timer;
        const concluir = () => {
          clearTimeout(timer);
          visor3d.removeEventListener("load", concluir);
          visor3d.removeEventListener("error", concluir);
          resolve();
        };
        visor3d.addEventListener("load", concluir);
        visor3d.addEventListener("error", concluir);
        timer = setTimeout(concluir, 12000);
      });
    }
    visor3d.src = `assets/modelos/${arquivo}`;
    atualizarModeloSelecionado(opcao);
    if (animar) {
      await carregamento;
      if (idTroca === trocaModeloAtual) await animarVisor("modelo-abrindo");
    }
  };

  opcoesModelo.forEach((opcao) => opcao.addEventListener("click", () => selecionarModelo(opcao, true)));

  document.querySelectorAll(".cartao--abrir-modelo").forEach((cartao) => cartao.addEventListener("click", async () => {
    const opcao = opcoesModelo.find((item) => item.dataset.nome === cartao.dataset.modelo);
    document.querySelector("#moving-demo")?.scrollIntoView({ behavior: movimentoReduzido ? "auto" : "smooth", block: "center" });
    if (!movimentoReduzido) await new Promise((resolve) => setTimeout(resolve, 420));
    await selecionarModelo(opcao, true);
  }));

  /* ── WhatsApp ─────────────────────────────────────────────────────────── */
  if (whats && S.whatsapp) {
    const num = String(S.whatsapp.numero || "").replace(/\D/g, "");
    whats.href = `https://wa.me/${num}?text=${encodeURIComponent(S.whatsapp.mensagem || "")}`;
  }

  /* ── Formulário → e-mail ──────────────────────────────────────────────── */
  const form = document.querySelector(".form");
  if (form && S.contato) {
    const status = form.querySelector(".form-status");
    const botao = form.querySelector("button[type=submit]");
    const avisar = (txt, tipo) => { status.textContent = txt; status.className = `form-status campo--inteiro ${tipo || ""}`; };

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (form.elements._honey.value) return; // robô
      let valido = true;
      form.querySelectorAll("[required]").forEach((c) => {
        const ok = c.type === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.value) : c.value.trim().length > 1;
        c.closest(".campo").classList.toggle("erro", !ok);
        if (!ok) valido = false;
      });
      if (!valido) return avisar("Confira os campos destacados.", "falha");

      const dados = Object.fromEntries(new FormData(form));
      delete dados._honey;
      const assunto = S.contato.assunto || `Novo contato pelo site ${S.nome || ""}`;
      let url, corpo;
      if (S.contato.web3formsChave) {
        url = "https://api.web3forms.com/submit";
        corpo = { access_key: S.contato.web3formsChave, subject: assunto, from_name: S.nome, ...dados };
      } else {
        url = `https://formsubmit.co/ajax/${encodeURIComponent(S.contato.email)}`;
        corpo = { _subject: assunto, _template: "table", _captcha: "false", ...dados };
      }

      botao.disabled = true;
      avisar("Enviando…");
      try {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(corpo),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.success === false || j.success === "false") throw new Error(j.message || r.status);
        form.reset();
        avisar("Recebemos seu contato. Em breve falamos com você.", "ok");
      } catch (e) {
        console.warn("Falha no envio do formulário:", e);
        avisar("Não foi possível enviar agora. Chame a gente no WhatsApp.", "falha");
      } finally {
        botao.disabled = false;
      }
    });
  }
})();
