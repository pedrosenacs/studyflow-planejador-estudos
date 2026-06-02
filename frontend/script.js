const API_URL = "http://127.0.0.1:5000";

const formTopico = document.getElementById("formTopico");
const listaTopicos = document.getElementById("listaTopicos");
const btnGerarCronograma = document.getElementById("btnGerarCronograma");
const cronogramaGerado = document.getElementById("cronogramaGerado");
const btnTema = document.getElementById("btnTema");
const toast = document.getElementById("toast");

const totalTopicos = document.getElementById("totalTopicos");
const topicosPendentes = document.getElementById("topicosPendentes");
const topicosConcluidos = document.getElementById("topicosConcluidos");
const progressoGeral = document.getElementById("progressoGeral");
const barraProgresso = document.getElementById("barraProgresso");
const textoResumoProgresso = document.getElementById("textoResumoProgresso");

const btnSubmit = document.getElementById("btnSubmit");
const btnCancelarEdicao = document.getElementById("btnCancelarEdicao");
const tituloFormulario = document.getElementById("tituloFormulario");
const subtituloFormulario = document.getElementById("subtituloFormulario");

const modalDiagnostico = document.getElementById("modalDiagnostico");
const btnFecharDiagnostico = document.getElementById("btnFecharDiagnostico");
const tituloDiagnostico = document.getElementById("tituloDiagnostico");
const subtituloDiagnostico = document.getElementById("subtituloDiagnostico");
const areaPerguntasDiagnostico = document.getElementById("areaPerguntasDiagnostico");
const areaResultadoDiagnostico = document.getElementById("areaResultadoDiagnostico");
const btnGerarResultadoDiagnostico = document.getElementById("btnGerarResultadoDiagnostico");
const btnAdicionarSubtopicos = document.getElementById("btnAdicionarSubtopicos");

let topicos = [];
let idTopicoEditando = null;

let subtopicosCronograma = JSON.parse(localStorage.getItem("studyflow-subtopicos-cronograma")) || [];
let topicosIgnoradosNoCronograma = JSON.parse(localStorage.getItem("studyflow-topicos-ignorados")) || [];

let topicoDiagnosticoAtual = null;
let perguntasDiagnostico = [];
let resultadoDiagnosticoAtual = null;

function mostrarToast(mensagem) {
    toast.textContent = mensagem;
    toast.classList.add("ativo");

    setTimeout(() => {
        toast.classList.remove("ativo");
    }, 2500);
}

async function carregarTopicos() {
    try {
        const resposta = await fetch(`${API_URL}/api/topicos`);
        topicos = await resposta.json();

        renderizarTopicos();
        atualizarDashboard();
    } catch (erro) {
        mostrarToast("Não foi possível conectar com a API.");
        console.error(erro);
    }
}

async function cadastrarTopico(evento) {
    evento.preventDefault();

    const materia = document.getElementById("materia").value.trim();
    const nome = document.getElementById("nomeTopico").value.trim();
    const dificuldade = document.getElementById("dificuldade").value;
    const tempoEstimado = document.getElementById("tempoEstimado").value;
    const prazo = document.getElementById("prazo").value;

    if (materia === "" || nome === "" || tempoEstimado === "" || prazo === "") {
        mostrarToast("Preencha todos os campos.");
        return;
    }

    const dadosTopico = {
        materia,
        nome,
        dificuldade,
        tempoEstimado,
        prazo
    };

    try {
        if (idTopicoEditando !== null) {
            const resposta = await fetch(`${API_URL}/api/topicos/${idTopicoEditando}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(dadosTopico)
            });

            if (!resposta.ok) {
                const erro = await resposta.json();
                mostrarToast(erro.erro || "Erro ao editar tópico.");
                return;
            }

            cancelarEdicao();
            mostrarToast("Tópico editado com sucesso!");
            await carregarTopicos();
            return;
        }

        const resposta = await fetch(`${API_URL}/api/topicos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dadosTopico)
        });

        if (!resposta.ok) {
            const erro = await resposta.json();
            mostrarToast(erro.erro || "Erro ao cadastrar tópico.");
            return;
        }

        formTopico.reset();
        mostrarToast("Tópico adicionado ao plano!");
        await carregarTopicos();

    } catch (erro) {
        mostrarToast("Erro ao conectar com a API.");
        console.error(erro);
    }
}

function atualizarDashboard() {
    const total = topicos.length;
    const pendentes = topicos.filter(topico => topico.status === "Pendente").length;
    const concluidos = topicos.filter(topico => topico.status === "Concluído").length;

    const progresso = total === 0 ? 0 : Math.round((concluidos / total) * 100);

    totalTopicos.textContent = total;
    topicosPendentes.textContent = pendentes;
    topicosConcluidos.textContent = concluidos;
    progressoGeral.textContent = `${progresso}%`;
    barraProgresso.style.width = `${progresso}%`;

    if (total === 0) {
        textoResumoProgresso.textContent = "Nenhum tópico concluído ainda.";
    } else if (progresso === 100) {
        textoResumoProgresso.textContent = "Parabéns! Todos os tópicos foram concluídos.";
    } else {
        textoResumoProgresso.textContent = `${concluidos} de ${total} tópicos concluídos.`;
    }
}

function classeDificuldade(dificuldade) {
    if (dificuldade === "Baixa") {
        return "badge-baixa";
    }

    if (dificuldade === "Média") {
        return "badge-media";
    }

    if (dificuldade === "Alta") {
        return "badge-alta";
    }

    return "";
}

function classeStatus(status) {
    if (status === "Concluído") {
        return "badge-concluido";
    }

    return "badge-pendente";
}

function classeUrgencia(urgencia) {
    if (urgencia === "Prazo vencido") {
        return "urgencia-vencido";
    }

    if (urgencia === "Vence hoje" || urgencia === "Muito urgente") {
        return "urgencia-alta";
    }

    if (urgencia === "Urgente" || urgencia === "Atenção") {
        return "urgencia-media";
    }

    return "urgencia-normal";
}

function formatarPrazo(prazo) {
    if (!prazo) {
        return "Não informado";
    }

    const partes = prazo.split("-");

    if (partes.length !== 3) {
        return prazo;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function renderizarTopicos() {
    listaTopicos.innerHTML = "";

    if (topicos.length === 0) {
        listaTopicos.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📚</div>
                <h3>Nenhum tópico cadastrado</h3>
                <p>Adicione seu primeiro tópico para iniciar o planejamento.</p>
            </div>
        `;
        return;
    }

    topicos.forEach(topico => {
        const card = document.createElement("div");
        card.classList.add("topico-card");

        const botaoStatus = topico.status === "Pendente"
            ? `
                <button class="btn-concluir" onclick="alterarStatus(${topico.id}, 'Concluído')">
                    ✅ Concluir
                </button>
            `
            : `
                <button class="btn-reabrir" onclick="alterarStatus(${topico.id}, 'Pendente')">
                    🔄 Reabrir
                </button>
            `;

        const tutorAplicado = topicosIgnoradosNoCronograma
            .map(id => Number(id))
            .includes(Number(topico.id));

        const badgeTutor = tutorAplicado
            ? `
                <span class="badge badge-tutor">
                    Tutor aplicado
                </span>
            `
            : "";

        const botaoTutor = tutorAplicado
            ? `
                <button class="btn-remover-tutor" onclick="removerDiagnosticoDoCronograma(${topico.id})">
                    ↩️ Remover Tutor
                </button>
            `
            : `
                <button class="btn-diagnosticar" onclick="abrirDiagnostico(${topico.id})">
                    🧠 Diagnosticar
                </button>
            `;

        card.innerHTML = `
            <div>
                <h3>${topico.nome}</h3>

                <p><strong>Matéria:</strong> ${topico.materia}</p>
                <p><strong>Tempo estimado:</strong> ${topico.tempoEstimado}h</p>
                <p><strong>Prazo:</strong> ${formatarPrazo(topico.prazo)}</p>

                <div class="badges">
                    <span class="badge ${classeStatus(topico.status)}">
                        ${topico.status}
                    </span>

                    <span class="badge ${classeDificuldade(topico.dificuldade)}">
                        Dificuldade ${topico.dificuldade}
                    </span>

                    ${badgeTutor}
                </div>
            </div>

            <div class="acoes-topico">
                <button class="btn-editar" onclick="editarTopico(${topico.id})">
                    ✏️ Editar
                </button>

                ${botaoTutor}

                ${botaoStatus}

                <button class="btn-excluir" onclick="excluirTopico(${topico.id})">
                    🗑️ Excluir
                </button>
            </div>
        `;

        listaTopicos.appendChild(card);
    });
}

function editarTopico(id) {
    const topico = topicos.find(topico => topico.id === id);

    if (!topico) {
        mostrarToast("Tópico não encontrado.");
        return;
    }

    idTopicoEditando = id;

    document.getElementById("materia").value = topico.materia;
    document.getElementById("nomeTopico").value = topico.nome;
    document.getElementById("dificuldade").value = topico.dificuldade;
    document.getElementById("tempoEstimado").value = topico.tempoEstimado;
    document.getElementById("prazo").value = topico.prazo;

    btnSubmit.textContent = "Salvar alterações";
    btnCancelarEdicao.classList.remove("escondido");

    tituloFormulario.textContent = `Editando tópico #${id}`;
    subtituloFormulario.textContent = "Altere os dados necessários e salve a edição.";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    mostrarToast("Modo de edição ativado.");
}

function cancelarEdicao() {
    idTopicoEditando = null;

    formTopico.reset();

    btnSubmit.textContent = "+ Adicionar ao plano";
    btnCancelarEdicao.classList.add("escondido");

    tituloFormulario.textContent = "Cadastrar tópico";
    subtituloFormulario.textContent = "Informe o que precisa estudar para o sistema montar um plano mais eficiente.";
}

async function alterarStatus(id, status) {
    try {
        const resposta = await fetch(`${API_URL}/api/topicos/${id}/status`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ status })
        });

        if (!resposta.ok) {
            mostrarToast("Erro ao alterar status.");
            return;
        }

        mostrarToast(`Tópico marcado como ${status}.`);
        await carregarTopicos();
    } catch (erro) {
        mostrarToast("Erro ao conectar com a API.");
        console.error(erro);
    }
}

async function excluirTopico(id) {
    const confirmar = confirm("Tem certeza que deseja excluir este tópico?");

    if (!confirmar) {
        return;
    }

    try {
        const resposta = await fetch(`${API_URL}/api/topicos/${id}`, {
            method: "DELETE"
        });

        if (!resposta.ok) {
            mostrarToast("Erro ao excluir tópico.");
            return;
        }

        if (idTopicoEditando === id) {
            cancelarEdicao();
        }

        subtopicosCronograma = subtopicosCronograma.filter(
            subtopico => Number(subtopico.origemId) !== Number(id)
        );

        topicosIgnoradosNoCronograma = topicosIgnoradosNoCronograma.filter(
            idIgnorado => Number(idIgnorado) !== Number(id)
        );

        localStorage.setItem(
            "studyflow-subtopicos-cronograma",
            JSON.stringify(subtopicosCronograma)
        );

        localStorage.setItem(
            "studyflow-topicos-ignorados",
            JSON.stringify(topicosIgnoradosNoCronograma)
        );

        mostrarToast("Tópico excluído com sucesso.");

        await carregarTopicos();
        await gerarCronograma();

    } catch (erro) {
        mostrarToast("Erro ao conectar com a API.");
        console.error(erro);
    }
}

async function gerarCronograma() {
    const campoHoras = document.querySelector("#cronograma #horasPorDia") || document.getElementById("horasPorDia");
    const horasPorDia = Number(campoHoras.value);

    const diasSelecionados = Array.from(document.querySelectorAll(".dia-estudo:checked"))
        .map(checkbox => Number(checkbox.value));

    if (!horasPorDia || horasPorDia <= 0) {
        mostrarToast("Informe uma quantidade válida de horas por dia.");
        return;
    }

    if (diasSelecionados.length === 0) {
        mostrarToast("Selecione pelo menos um dia para estudar.");
        return;
    }

    const idsIgnorados = topicosIgnoradosNoCronograma.map(id => Number(id));

    const payload = {
        horasPorDia,
        diasDisponiveis: diasSelecionados,
        topicosExtras: subtopicosCronograma,
        topicosIgnorados: idsIgnorados
    };

    try {
        const resposta = await fetch(`${API_URL}/api/cronograma/gerar`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!resposta.ok) {
            const erro = await resposta.json();
            mostrarToast(erro.erro || "Erro ao gerar cronograma.");
            return;
        }

        const cronograma = await resposta.json();

        renderizarCronograma(cronograma);
        mostrarToast("Cronograma semanal gerado com sucesso!");
    } catch (erro) {
        mostrarToast("Erro ao conectar com a API.");
        console.error(erro);
    }
}

function renderizarCronograma(cronograma) {
    cronogramaGerado.innerHTML = "";

    if (cronograma.length === 0) {
        cronogramaGerado.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🗓️</div>
                <h3>Nenhum cronograma gerado</h3>
                <p>Não há tópicos pendentes para organizar.</p>
            </div>
        `;
        return;
    }

    cronograma.forEach(dia => {
        const diaElemento = document.createElement("div");
        diaElemento.classList.add("dia-semana-card");

        if (!dia.disponivel) {
            diaElemento.classList.add("dia-descanso");
        }

        let conteudoDia = "";

        if (!dia.disponivel) {
            conteudoDia = `
                <div class="dia-sem-estudo">
                    <span>Descanso</span>
                    <p>Este dia não foi selecionado para estudo.</p>
                </div>
            `;
        } else if (dia.itens.length === 0) {
            conteudoDia = `
                <div class="dia-sem-estudo">
                    <span>Sem atividade planejada</span>
                    <p>Não há conteúdo suficiente para preencher este dia.</p>
                </div>
            `;
        } else {
            conteudoDia = dia.itens.map(item => {
                if (item.tipo === "revisao") {
                    return `
                        <div class="item-semana item-revisao-guiada">
                            <div class="topo-item-semana">
                                <strong>Revisão guiada</strong>

                                <span class="badge-urgencia urgencia-revisao">
                                    Tutor
                                </span>
                            </div>

                            <h4>${item.topico}</h4>

                            <p>
                                ${item.horas}h para reforçar este conteúdo
                            </p>

                            <p>
                                Revise anotações, refaça exercícios e corrija dúvidas.
                            </p>
                        </div>
                    `;
                }

                return `
                    <div class="item-semana">
                        <div class="topo-item-semana">
                            <strong>${item.materia}</strong>

                            <span class="badge-urgencia ${classeUrgencia(item.urgencia)}">
                                ${item.urgencia}
                            </span>
                        </div>

                        <h4>${item.topico}</h4>

                        <p>
                            ${item.horas}h de estudo • Dificuldade ${item.dificuldade}
                        </p>

                        <p>
                            Prazo: ${formatarPrazo(item.prazo)} • Prioridade: ${item.prioridade}
                        </p>
                    </div>
                `;
            }).join("");
        }

        diaElemento.innerHTML = `
            <div class="cabecalho-dia-semana">
                <div>
                    <h3>${dia.diaSemana}</h3>
                    <span>${dia.data}</span>
                </div>

                <strong>${dia.totalHoras}h</strong>
            </div>

            <div class="conteudo-dia-semana">
                ${conteudoDia}
            </div>
        `;

        cronogramaGerado.appendChild(diaElemento);
    });
}

async function abrirDiagnostico(id) {
    const topico = topicos.find(topico => Number(topico.id) === Number(id));

    if (!topico) {
        mostrarToast("Tópico não encontrado.");
        return;
    }

    if (!modalDiagnostico) {
        mostrarToast("Modal de diagnóstico não encontrado no HTML.");
        return;
    }

    topicoDiagnosticoAtual = topico;
    resultadoDiagnosticoAtual = null;

    tituloDiagnostico.textContent = `Diagnóstico: ${topico.nome}`;
    subtituloDiagnostico.textContent = `Matéria: ${topico.materia}`;

    areaPerguntasDiagnostico.innerHTML = "";
    areaResultadoDiagnostico.innerHTML = "";
    areaResultadoDiagnostico.classList.add("escondido");
    btnAdicionarSubtopicos.classList.add("escondido");
    btnGerarResultadoDiagnostico.classList.remove("escondido");

    try {
        const resposta = await fetch(`${API_URL}/api/diagnostico/perguntas`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                materia: topico.materia,
                topico: topico.nome
            })
        });

        if (!resposta.ok) {
            mostrarToast("Erro ao gerar perguntas.");
            return;
        }

        const dados = await resposta.json();
        perguntasDiagnostico = dados.perguntas;

        renderizarPerguntasDiagnostico();
        modalDiagnostico.classList.remove("escondido");

    } catch (erro) {
        mostrarToast("Erro ao conectar com a API.");
        console.error(erro);
    }
}

function renderizarPerguntasDiagnostico() {
    areaPerguntasDiagnostico.innerHTML = "";

    perguntasDiagnostico.forEach((pergunta, index) => {
        const bloco = document.createElement("div");
        bloco.classList.add("pergunta-diagnostico");

        bloco.innerHTML = `
            <h3>${index + 1}. ${pergunta.texto}</h3>

            <div class="opcoes-diagnostico">
                <label>
                    <input type="radio" name="pergunta-${index}" value="Sim">
                    Sim
                </label>

                <label>
                    <input type="radio" name="pergunta-${index}" value="Mais ou menos">
                    Mais ou menos
                </label>

                <label>
                    <input type="radio" name="pergunta-${index}" value="Não">
                    Não
                </label>
            </div>
        `;

        areaPerguntasDiagnostico.appendChild(bloco);
    });
}

async function gerarResultadoDiagnostico() {
    if (!topicoDiagnosticoAtual) {
        mostrarToast("Nenhum tópico selecionado.");
        return;
    }

    const respostas = [];

    for (let i = 0; i < perguntasDiagnostico.length; i++) {
        const marcada = document.querySelector(`input[name="pergunta-${i}"]:checked`);

        if (!marcada) {
            mostrarToast("Responda todas as perguntas.");
            return;
        }

        respostas.push({
            pergunta: perguntasDiagnostico[i].texto,
            area: perguntasDiagnostico[i].area,
            resposta: marcada.value
        });
    }

    try {
        const resposta = await fetch(`${API_URL}/api/diagnostico/resultado`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                materia: topicoDiagnosticoAtual.materia,
                topico: topicoDiagnosticoAtual.nome,
                dificuldade: topicoDiagnosticoAtual.dificuldade,
                prazo: topicoDiagnosticoAtual.prazo,
                respostas
            })
        });

        if (!resposta.ok) {
            mostrarToast("Erro ao gerar diagnóstico.");
            return;
        }

        resultadoDiagnosticoAtual = await resposta.json();

        renderizarResultadoDiagnostico();
        btnGerarResultadoDiagnostico.classList.add("escondido");
        btnAdicionarSubtopicos.classList.remove("escondido");

    } catch (erro) {
        mostrarToast("Erro ao conectar com a API.");
        console.error(erro);
    }
}

function renderizarResultadoDiagnostico() {
    if (!resultadoDiagnosticoAtual) {
        return;
    }

    const pontos = resultadoDiagnosticoAtual.pontosAtencao.length === 0
        ? "<li>Nenhum ponto crítico identificado.</li>"
        : resultadoDiagnosticoAtual.pontosAtencao
            .map(ponto => `<li>${ponto}</li>`)
            .join("");

    const sugestoes = resultadoDiagnosticoAtual.sugestoes
        .map(sugestao => `<li>${sugestao}</li>`)
        .join("");

    const subtopicos = resultadoDiagnosticoAtual.subtopicos
        .map(subtopico => `<li>${subtopico.nome} — ${subtopico.tempoEstimado}h</li>`)
        .join("");

    areaResultadoDiagnostico.innerHTML = `
        <div class="resultado-card">
            <h3>Resultado do diagnóstico</h3>
            <p>${resultadoDiagnosticoAtual.resumo}</p>

            <h4>Pontos de atenção</h4>
            <ul>${pontos}</ul>

            <h4>Sugestões de estudo</h4>
            <ul>${sugestoes}</ul>

            <h4>Subtópicos que entrarão no cronograma</h4>
            <ul>${subtopicos}</ul>
        </div>
    `;

    areaResultadoDiagnostico.classList.remove("escondido");
}

async function adicionarSubtopicosAoPlano() {
    if (!resultadoDiagnosticoAtual) {
        mostrarToast("Nenhum diagnóstico gerado.");
        return;
    }

    if (!topicoDiagnosticoAtual) {
        mostrarToast("Tópico original não encontrado.");
        return;
    }

    const novosSubtopicos = resultadoDiagnosticoAtual.subtopicos.map(subtopico => {
        return {
            ...subtopico,
            origemId: Number(topicoDiagnosticoAtual.id),
            origemNome: topicoDiagnosticoAtual.nome
        };
    });

    subtopicosCronograma = subtopicosCronograma.filter(
        subtopico => Number(subtopico.origemId) !== Number(topicoDiagnosticoAtual.id)
    );

    subtopicosCronograma.push(...novosSubtopicos);

    topicosIgnoradosNoCronograma = topicosIgnoradosNoCronograma
        .map(id => Number(id))
        .filter(id => id !== Number(topicoDiagnosticoAtual.id));

    topicosIgnoradosNoCronograma.push(Number(topicoDiagnosticoAtual.id));

    localStorage.setItem(
        "studyflow-subtopicos-cronograma",
        JSON.stringify(subtopicosCronograma)
    );

    localStorage.setItem(
        "studyflow-topicos-ignorados",
        JSON.stringify(topicosIgnoradosNoCronograma)
    );

    mostrarToast("Diagnóstico aplicado ao cronograma!");

    fecharDiagnostico();

    await carregarTopicos();
    await gerarCronograma();
}

async function removerDiagnosticoDoCronograma(id) {
    const confirmar = confirm("Deseja remover o Tutor deste tópico e voltar a usar o tópico original no cronograma?");

    if (!confirmar) {
        return;
    }

    subtopicosCronograma = subtopicosCronograma.filter(
        subtopico => Number(subtopico.origemId) !== Number(id)
    );

    topicosIgnoradosNoCronograma = topicosIgnoradosNoCronograma.filter(
        idIgnorado => Number(idIgnorado) !== Number(id)
    );

    localStorage.setItem(
        "studyflow-subtopicos-cronograma",
        JSON.stringify(subtopicosCronograma)
    );

    localStorage.setItem(
        "studyflow-topicos-ignorados",
        JSON.stringify(topicosIgnoradosNoCronograma)
    );

    mostrarToast("Tutor removido do cronograma.");

    await carregarTopicos();
    await gerarCronograma();
}

function fecharDiagnostico() {
    if (!modalDiagnostico) {
        return;
    }

    modalDiagnostico.classList.add("escondido");
    areaPerguntasDiagnostico.innerHTML = "";
    areaResultadoDiagnostico.innerHTML = "";
    areaResultadoDiagnostico.classList.add("escondido");
    btnAdicionarSubtopicos.classList.add("escondido");
    btnGerarResultadoDiagnostico.classList.remove("escondido");

    topicoDiagnosticoAtual = null;
    perguntasDiagnostico = [];
    resultadoDiagnosticoAtual = null;
}

function carregarTema() {
    const temaSalvo = localStorage.getItem("studyflow-tema");

    if (temaSalvo === "escuro") {
        document.body.classList.add("modo-escuro");
        btnTema.textContent = "☀️ Modo claro";
    } else {
        btnTema.textContent = "🌙 Modo escuro";
    }
}

function alternarTema() {
    document.body.classList.toggle("modo-escuro");

    if (document.body.classList.contains("modo-escuro")) {
        localStorage.setItem("studyflow-tema", "escuro");
        btnTema.textContent = "☀️ Modo claro";
        mostrarToast("Modo escuro ativado.");
    } else {
        localStorage.setItem("studyflow-tema", "claro");
        btnTema.textContent = "🌙 Modo escuro";
        mostrarToast("Modo claro ativado.");
    }
}

formTopico.addEventListener("submit", cadastrarTopico);
btnGerarCronograma.addEventListener("click", gerarCronograma);
btnTema.addEventListener("click", alternarTema);
btnCancelarEdicao.addEventListener("click", cancelarEdicao);

if (btnFecharDiagnostico) {
    btnFecharDiagnostico.addEventListener("click", fecharDiagnostico);
}

if (btnGerarResultadoDiagnostico) {
    btnGerarResultadoDiagnostico.addEventListener("click", gerarResultadoDiagnostico);
}

if (btnAdicionarSubtopicos) {
    btnAdicionarSubtopicos.addEventListener("click", adicionarSubtopicosAoPlano);
}

carregarTema();
carregarTopicos();