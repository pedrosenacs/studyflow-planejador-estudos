from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from datetime import datetime, timedelta


app = Flask(__name__)
CORS(app)

ARQUIVO_DADOS = "dados.json"


def carregar_topicos():
    if not os.path.exists(ARQUIVO_DADOS):
        return []

    with open(ARQUIVO_DADOS, "r", encoding="utf-8") as arquivo:
        try:
            return json.load(arquivo)
        except json.JSONDecodeError:
            return []


def salvar_topicos(topicos):
    with open(ARQUIVO_DADOS, "w", encoding="utf-8") as arquivo:
        json.dump(topicos, arquivo, indent=4, ensure_ascii=False)


def gerar_id(topicos):
    if len(topicos) == 0:
        return 1

    maior_id = max(topico["id"] for topico in topicos)
    return maior_id + 1


def calcular_peso_dificuldade(dificuldade):
    if dificuldade == "Alta":
        return 3

    if dificuldade == "Média":
        return 2

    return 1


def analisar_prazo(prazo_texto):
    try:
        prazo = datetime.strptime(prazo_texto, "%Y-%m-%d").date()
        hoje = datetime.now().date()
        dias_restantes = (prazo - hoje).days

        if dias_restantes < 0:
            return dias_restantes, "Prazo vencido", 6

        if dias_restantes == 0:
            return dias_restantes, "Vence hoje", 5

        if dias_restantes <= 3:
            return dias_restantes, "Muito urgente", 4

        if dias_restantes <= 7:
            return dias_restantes, "Urgente", 3

        if dias_restantes <= 14:
            return dias_restantes, "Atenção", 2

        return dias_restantes, "Normal", 1

    except ValueError:
        return None, "Sem prazo válido", 1


def calcular_prioridade(topico):
    peso_dificuldade = calcular_peso_dificuldade(topico["dificuldade"])
    dias_restantes, texto_urgencia, peso_urgencia = analisar_prazo(topico["prazo"])

    tempo_estimado = float(topico["tempoEstimado"])

    if tempo_estimado >= 3:
        peso_tempo = 2
    elif tempo_estimado >= 1.5:
        peso_tempo = 1
    else:
        peso_tempo = 0

    prioridade = (peso_dificuldade * 2) + peso_urgencia + peso_tempo

    return prioridade


def normalizar_texto(texto):
    return texto.lower().strip()


BASE_DIAGNOSTICO = {
    "laços de repetição": {
        "perguntas": [
            {
                "id": "for_while",
                "area": "Diferença entre for e while",
                "texto": "Você entende a diferença entre usar for e while?"
            },
            {
                "id": "condicao_parada",
                "area": "Condição de parada",
                "texto": "Você consegue definir corretamente quando um loop deve parar?"
            },
            {
                "id": "contador",
                "area": "Contadores",
                "texto": "Você entende como usar contador dentro de um laço?"
            },
            {
                "id": "acumulador",
                "area": "Acumuladores",
                "texto": "Você entende como usar acumulador para somar ou agrupar valores?"
            },
            {
                "id": "loops_aninhados",
                "area": "Laços aninhados",
                "texto": "Você tem dificuldade com laços dentro de outros laços?"
            },
            {
                "id": "exercicios",
                "area": "Prática com exercícios",
                "texto": "Você consegue resolver exercícios de laços sem olhar exemplos prontos?"
            }
        ]
    },
    "vetores": {
        "perguntas": [
            {
                "id": "indice",
                "area": "Índices",
                "texto": "Você entende como acessar posições de um vetor usando índices?"
            },
            {
                "id": "percorrer",
                "area": "Percorrer vetores",
                "texto": "Você consegue percorrer um vetor usando laços de repetição?"
            },
            {
                "id": "alterar",
                "area": "Alteração de valores",
                "texto": "Você entende como alterar valores dentro de um vetor?"
            },
            {
                "id": "busca",
                "area": "Busca em vetores",
                "texto": "Você consegue procurar um valor dentro de um vetor?"
            },
            {
                "id": "exercicios",
                "area": "Prática com exercícios",
                "texto": "Você consegue resolver exercícios envolvendo vetores?"
            }
        ]
    },
    "funções": {
        "perguntas": [
            {
                "id": "criacao",
                "area": "Criação de funções",
                "texto": "Você entende como criar uma função?"
            },
            {
                "id": "parametros",
                "area": "Parâmetros",
                "texto": "Você entende como passar valores para uma função?"
            },
            {
                "id": "retorno",
                "area": "Retorno",
                "texto": "Você entende quando uma função deve retornar um valor?"
            },
            {
                "id": "reutilizacao",
                "area": "Reutilização de código",
                "texto": "Você consegue identificar quando vale a pena criar uma função?"
            },
            {
                "id": "exercicios",
                "area": "Prática com exercícios",
                "texto": "Você consegue resolver exercícios usando funções?"
            }
        ]
    },
    "matrizes": {
        "perguntas": [
            {
                "id": "linhas_colunas",
                "area": "Linhas e colunas",
                "texto": "Você entende a diferença entre linhas e colunas em uma matriz?"
            },
            {
                "id": "indices",
                "area": "Índices de matriz",
                "texto": "Você entende como acessar uma posição usando dois índices?"
            },
            {
                "id": "percorrer",
                "area": "Percorrer matrizes",
                "texto": "Você consegue percorrer uma matriz usando laços aninhados?"
            },
            {
                "id": "exercicios",
                "area": "Prática com exercícios",
                "texto": "Você consegue resolver exercícios envolvendo matrizes?"
            }
        ]
    },
    "python": {
        "perguntas": [
            {
                "id": "sintaxe",
                "area": "Sintaxe básica",
                "texto": "Você entende a sintaxe básica do Python?"
            },
            {
                "id": "variaveis",
                "area": "Variáveis e tipos",
                "texto": "Você entende variáveis, tipos de dados e conversões?"
            },
            {
                "id": "condicionais",
                "area": "Condicionais",
                "texto": "Você consegue usar if, elif e else corretamente?"
            },
            {
                "id": "listas",
                "area": "Listas",
                "texto": "Você entende como criar, acessar e alterar listas?"
            },
            {
                "id": "funcoes",
                "area": "Funções",
                "texto": "Você entende como criar e usar funções em Python?"
            }
        ]
    },
    "html": {
        "perguntas": [
            {
                "id": "estrutura",
                "area": "Estrutura HTML",
                "texto": "Você entende a estrutura básica de uma página HTML?"
            },
            {
                "id": "tags",
                "area": "Tags principais",
                "texto": "Você conhece as principais tags HTML?"
            },
            {
                "id": "formularios",
                "area": "Formulários",
                "texto": "Você entende como criar formulários com inputs, labels e botões?"
            },
            {
                "id": "semantica",
                "area": "HTML semântico",
                "texto": "Você entende a importância de usar tags semânticas?"
            }
        ]
    },
    "css": {
        "perguntas": [
            {
                "id": "seletores",
                "area": "Seletores",
                "texto": "Você entende como usar seletores de classe, id e elemento?"
            },
            {
                "id": "box_model",
                "area": "Box model",
                "texto": "Você entende margin, padding, border e width?"
            },
            {
                "id": "flex_grid",
                "area": "Flexbox e Grid",
                "texto": "Você consegue organizar layouts usando Flexbox ou Grid?"
            },
            {
                "id": "responsividade",
                "area": "Responsividade",
                "texto": "Você entende como adaptar o layout para telas menores?"
            }
        ]
    },
    "javascript": {
        "perguntas": [
            {
                "id": "dom",
                "area": "Manipulação do DOM",
                "texto": "Você entende como selecionar e alterar elementos da página?"
            },
            {
                "id": "eventos",
                "area": "Eventos",
                "texto": "Você entende como usar eventos de clique, input ou submit?"
            },
            {
                "id": "arrays_objetos",
                "area": "Arrays e objetos",
                "texto": "Você entende como trabalhar com arrays e objetos?"
            },
            {
                "id": "fetch",
                "area": "Requisições com fetch",
                "texto": "Você entende como consumir uma API usando fetch?"
            }
        ]
    }
}


PERGUNTAS_GENERICAS = [
    {
        "id": "conceito",
        "area": "Conceito principal",
        "texto": "Você entende o conceito principal deste tópico?"
    },
    {
        "id": "aplicacao",
        "area": "Aplicação prática",
        "texto": "Você consegue aplicar este tópico em exercícios práticos?"
    },
    {
        "id": "exemplos",
        "area": "Interpretação de exemplos",
        "texto": "Você entende exemplos resolvidos sobre este assunto?"
    },
    {
        "id": "autonomia",
        "area": "Autonomia",
        "texto": "Você consegue resolver questões sem consultar a resposta?"
    },
    {
        "id": "revisao",
        "area": "Revisão",
        "texto": "Você sente que precisa revisar a base antes de avançar?"
    }
]


def obter_perguntas_por_topico(nome_topico):
    nome_normalizado = normalizar_texto(nome_topico)

    for chave in BASE_DIAGNOSTICO:
        if chave in nome_normalizado:
            return BASE_DIAGNOSTICO[chave]["perguntas"]

    return PERGUNTAS_GENERICAS


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "mensagem": "API StudyFlow funcionando - VERSAO TUTOR!",
        "endpoints": [
            "GET /api/topicos",
            "POST /api/topicos",
            "PUT /api/topicos/<id>",
            "PATCH /api/topicos/<id>/status",
            "DELETE /api/topicos/<id>",
            "POST /api/cronograma/gerar",
            "POST /api/diagnostico/perguntas",
            "POST /api/diagnostico/resultado"
        ]
    })


@app.route("/api/topicos", methods=["GET"])
def listar_topicos():
    topicos = carregar_topicos()
    return jsonify(topicos)


@app.route("/api/topicos", methods=["POST"])
def criar_topico():
    dados = request.get_json()

    materia = dados.get("materia", "").strip()
    nome = dados.get("nome", "").strip()
    dificuldade = dados.get("dificuldade", "").strip()
    tempo_estimado = dados.get("tempoEstimado")
    prazo = dados.get("prazo", "").strip()

    if materia == "" or nome == "" or dificuldade == "" or prazo == "":
        return jsonify({
            "erro": "Matéria, tópico, dificuldade e prazo são obrigatórios."
        }), 400

    try:
        tempo_estimado = float(tempo_estimado)

        if tempo_estimado <= 0:
            return jsonify({
                "erro": "O tempo estimado deve ser maior que zero."
            }), 400

    except (TypeError, ValueError):
        return jsonify({
            "erro": "Tempo estimado inválido."
        }), 400

    if dificuldade not in ["Baixa", "Média", "Alta"]:
        return jsonify({
            "erro": "Dificuldade inválida."
        }), 400

    topicos = carregar_topicos()

    novo_topico = {
        "id": gerar_id(topicos),
        "materia": materia,
        "nome": nome,
        "dificuldade": dificuldade,
        "tempoEstimado": tempo_estimado,
        "prazo": prazo,
        "status": "Pendente",
        "dataCadastro": datetime.now().strftime("%d/%m/%Y %H:%M")
    }

    topicos.append(novo_topico)
    salvar_topicos(topicos)

    return jsonify(novo_topico), 201


@app.route("/api/topicos/<int:id_topico>", methods=["PUT"])
def editar_topico(id_topico):
    dados = request.get_json()
    topicos = carregar_topicos()

    for topico in topicos:
        if topico["id"] == id_topico:
            materia = dados.get("materia", "").strip()
            nome = dados.get("nome", "").strip()
            dificuldade = dados.get("dificuldade", "").strip()
            tempo_estimado = dados.get("tempoEstimado")
            prazo = dados.get("prazo", "").strip()

            if materia == "" or nome == "" or dificuldade == "" or prazo == "":
                return jsonify({
                    "erro": "Matéria, tópico, dificuldade e prazo são obrigatórios."
                }), 400

            try:
                tempo_estimado = float(tempo_estimado)

                if tempo_estimado <= 0:
                    return jsonify({
                        "erro": "O tempo estimado deve ser maior que zero."
                    }), 400

            except (TypeError, ValueError):
                return jsonify({
                    "erro": "Tempo estimado inválido."
                }), 400

            if dificuldade not in ["Baixa", "Média", "Alta"]:
                return jsonify({
                    "erro": "Dificuldade inválida."
                }), 400

            topico["materia"] = materia
            topico["nome"] = nome
            topico["dificuldade"] = dificuldade
            topico["tempoEstimado"] = tempo_estimado
            topico["prazo"] = prazo

            salvar_topicos(topicos)
            return jsonify(topico)

    return jsonify({
        "erro": "Tópico não encontrado."
    }), 404


@app.route("/api/topicos/<int:id_topico>/status", methods=["PATCH"])
def alterar_status(id_topico):
    dados = request.get_json()
    novo_status = dados.get("status", "")

    if novo_status not in ["Pendente", "Concluído"]:
        return jsonify({
            "erro": "Status inválido."
        }), 400

    topicos = carregar_topicos()

    for topico in topicos:
        if topico["id"] == id_topico:
            topico["status"] = novo_status
            salvar_topicos(topicos)
            return jsonify(topico)

    return jsonify({
        "erro": "Tópico não encontrado."
    }), 404


@app.route("/api/topicos/<int:id_topico>", methods=["DELETE"])
def excluir_topico(id_topico):
    topicos = carregar_topicos()
    topicos_filtrados = [topico for topico in topicos if topico["id"] != id_topico]

    if len(topicos) == len(topicos_filtrados):
        return jsonify({
            "erro": "Tópico não encontrado."
        }), 404

    salvar_topicos(topicos_filtrados)

    return jsonify({
        "mensagem": "Tópico excluído com sucesso."
    })


@app.route("/api/cronograma/gerar", methods=["POST"])
def gerar_cronograma():
    dados = request.get_json()

    horas_por_dia = dados.get("horasPorDia", 2)
    dias_disponiveis = dados.get("diasDisponiveis", [0, 1, 2, 3, 4])
    topicos_extras = dados.get("topicosExtras", [])
    topicos_ignorados = dados.get("topicosIgnorados", [])

    try:
        horas_por_dia = float(horas_por_dia)

        if horas_por_dia <= 0:
            return jsonify({
                "erro": "As horas por dia devem ser maiores que zero."
            }), 400

    except (TypeError, ValueError):
        return jsonify({
            "erro": "Horas por dia inválidas."
        }), 400

    if not isinstance(dias_disponiveis, list) or len(dias_disponiveis) == 0:
        return jsonify({
            "erro": "Selecione pelo menos um dia disponível para estudo."
        }), 400

    try:
        dias_disponiveis = [int(dia) for dia in dias_disponiveis]
    except (TypeError, ValueError):
        return jsonify({
            "erro": "Dias disponíveis inválidos."
        }), 400

    dias_disponiveis = [
        dia for dia in dias_disponiveis
        if 0 <= dia <= 6
    ]

    if len(dias_disponiveis) == 0:
        return jsonify({
            "erro": "Nenhum dia válido foi selecionado."
        }), 400

    try:
        topicos_ignorados = [int(id_topico) for id_topico in topicos_ignorados]
    except (TypeError, ValueError):
        topicos_ignorados = []

    topicos = carregar_topicos()

    topicos_pendentes = [
        topico for topico in topicos
        if topico["status"] == "Pendente" and topico["id"] not in topicos_ignorados
    ]

    if isinstance(topicos_extras, list):
        for indice, topico_extra in enumerate(topicos_extras):
            materia = str(topico_extra.get("materia", "")).strip()
            nome = str(topico_extra.get("nome", "")).strip()
            dificuldade = str(topico_extra.get("dificuldade", "Média")).strip()
            prazo = str(topico_extra.get("prazo", "")).strip()
            tempo_estimado = topico_extra.get("tempoEstimado", 1)

            if materia == "" or nome == "" or prazo == "":
                continue

            try:
                tempo_estimado = float(tempo_estimado)
            except (TypeError, ValueError):
                tempo_estimado = 1

            if tempo_estimado <= 0:
                tempo_estimado = 1

            if dificuldade not in ["Baixa", "Média", "Alta"]:
                dificuldade = "Média"

            topicos_pendentes.append({
                "id": f"extra-{indice}",
                "materia": materia,
                "nome": nome,
                "dificuldade": dificuldade,
                "tempoEstimado": tempo_estimado,
                "prazo": prazo,
                "status": "Pendente",
                "dataCadastro": "Gerado pelo Tutor"
            })

    if len(topicos_pendentes) == 0:
        return jsonify([])

    dias_semana = [
        "Segunda-feira",
        "Terça-feira",
        "Quarta-feira",
        "Quinta-feira",
        "Sexta-feira",
        "Sábado",
        "Domingo"
    ]

    hoje = datetime.now().date()
    inicio_semana = hoje - timedelta(days=hoje.weekday())

    dias_planejamento = []

    for indice in range(7):
        data = inicio_semana + timedelta(days=indice)
        indice_semana = data.weekday()
        nome_dia = dias_semana[indice_semana]

        dias_planejamento.append({
            "diaSemana": nome_dia,
            "data": data.strftime("%d/%m/%Y"),
            "indiceSemana": indice_semana,
            "disponivel": indice_semana in dias_disponiveis,
            "totalHoras": 0,
            "itens": []
        })

    dias_para_estudo = [
        dia for dia in dias_planejamento
        if dia["disponivel"]
    ]

    if len(dias_para_estudo) == 0:
        return jsonify({
            "erro": "Nenhum dia selecionado está disponível nesta semana."
        }), 400

    topicos_planejamento = []

    for topico in topicos_pendentes:
        dias_restantes, texto_urgencia, peso_urgencia = analisar_prazo(topico["prazo"])

        topico_planejado = {
            **topico,
            "horasRestantes": float(topico["tempoEstimado"]),
            "prioridade": calcular_prioridade(topico),
            "diasRestantes": dias_restantes,
            "urgencia": texto_urgencia
        }

        topicos_planejamento.append(topico_planejado)

    topicos_planejamento = sorted(
        topicos_planejamento,
        key=lambda topico: (
            -topico["prioridade"],
            topico["prazo"]
        )
    )

    indice_topico = 0

    for dia in dias_para_estudo:
        horas_livres = horas_por_dia - dia["totalHoras"]

        while horas_livres > 0 and any(topico["horasRestantes"] > 0 for topico in topicos_planejamento):
            topico_atual = None
            tentativas = 0

            while tentativas < len(topicos_planejamento):
                candidato = topicos_planejamento[indice_topico]

                if candidato["horasRestantes"] > 0:
                    topico_atual = candidato
                    break

                indice_topico = (indice_topico + 1) % len(topicos_planejamento)
                tentativas += 1

            if topico_atual is None:
                break

            horas_alocadas = min(
                topico_atual["horasRestantes"],
                horas_livres
            )

            item = {
                "materia": topico_atual["materia"],
                "topico": topico_atual["nome"],
                "dificuldade": topico_atual["dificuldade"],
                "horas": horas_alocadas,
                "prazo": topico_atual["prazo"],
                "urgencia": topico_atual["urgencia"],
                "diasRestantes": topico_atual["diasRestantes"],
                "prioridade": topico_atual["prioridade"],
                "tipo": "estudo"
            }

            dia["itens"].append(item)

            dia["totalHoras"] += horas_alocadas
            topico_atual["horasRestantes"] -= horas_alocadas
            horas_livres -= horas_alocadas

            if topico_atual["horasRestantes"] <= 0:
                indice_topico = (indice_topico + 1) % len(topicos_planejamento)

    ultimo_topico_para_revisar = None

    for dia in dias_planejamento:
        if len(dia["itens"]) > 0:
            ultimo_item_estudo = None

            for item in dia["itens"]:
                if item.get("tipo") == "estudo":
                    ultimo_item_estudo = item

            if ultimo_item_estudo is not None:
                ultimo_topico_para_revisar = ultimo_item_estudo["topico"]

        if dia["disponivel"] and ultimo_topico_para_revisar is not None:
            horas_faltantes = horas_por_dia - dia["totalHoras"]

            if horas_faltantes > 0:
                nome_base_revisao = ultimo_topico_para_revisar

                nome_base_revisao = nome_base_revisao.replace("Revisar: ", "")
                nome_base_revisao = nome_base_revisao.replace("Reforçar: ", "")
                nome_base_revisao = nome_base_revisao.replace(": Revisão", "")
                nome_base_revisao = nome_base_revisao.strip()

                dia["itens"].append({
                    "materia": "StudyFlow Tutor",
                    "topico": nome_base_revisao,
                    "dificuldade": "Baixa",
                    "horas": horas_faltantes,
                    "prazo": "",
                    "urgencia": "Revisão guiada",
                    "diasRestantes": None,
                    "prioridade": 0,
                    "tipo": "revisao"
                })

                dia["totalHoras"] += horas_faltantes

    return jsonify(dias_planejamento)


@app.route("/api/diagnostico/perguntas", methods=["POST"])
def gerar_perguntas_diagnostico():
    dados = request.get_json()

    topico = dados.get("topico", "").strip()

    if topico == "":
        return jsonify({
            "erro": "Tópico não informado."
        }), 400

    perguntas = obter_perguntas_por_topico(topico)

    return jsonify({
        "topico": topico,
        "perguntas": perguntas
    })


@app.route("/api/diagnostico/resultado", methods=["POST"])
def gerar_resultado_diagnostico():
    dados = request.get_json()

    materia = dados.get("materia", "").strip()
    topico = dados.get("topico", "").strip()
    dificuldade = dados.get("dificuldade", "Média")
    prazo = dados.get("prazo", "")
    respostas = dados.get("respostas", [])

    if topico == "" or not isinstance(respostas, list):
        return jsonify({
            "erro": "Dados inválidos para diagnóstico."
        }), 400

    pontos_atencao = []
    sugestoes = []
    subtopicos = []

    for resposta in respostas:
        valor = resposta.get("resposta")
        area = resposta.get("area")

        if valor in ["Não", "Mais ou menos"]:
            pontos_atencao.append(area)

            sugestoes.append(
                f"Revisar {area.lower()} com exemplos simples antes de avançar."
            )

            subtopicos.append({
                "materia": materia,
                "nome": f"{topico}: {area}",
                "dificuldade": dificuldade,
                "tempoEstimado": 1,
                "prazo": prazo
            })

    if len(pontos_atencao) == 0:
        resumo = "Você demonstrou boa segurança neste tópico. O ideal agora é praticar com exercícios mais completos."
        sugestoes.append("Resolver exercícios práticos para consolidar o conteúdo.")
        subtopicos.append({
            "materia": materia,
            "nome": f"{topico}: exercícios práticos",
            "dificuldade": dificuldade,
            "tempoEstimado": 1,
            "prazo": prazo
        })
    else:
        resumo = (
            f"Foram identificados {len(pontos_atencao)} ponto(s) de atenção em {topico}. "
            "O recomendado é dividir o estudo em partes menores antes de avançar."
        )

    return jsonify({
        "materia": materia,
        "topico": topico,
        "resumo": resumo,
        "pontosAtencao": pontos_atencao,
        "sugestoes": sugestoes,
        "subtopicos": subtopicos
    })


if __name__ == "__main__":
    app.run(debug=True)