import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Way Home" },
      { name: "description", content: "Termos e condições de uso dos serviços e site da Way Home." },
      { property: "og:title", content: "Termos de Uso — Way Home" },
      { property: "og:description", content: "Termos e condições de uso dos serviços e site da Way Home." },
      { property: "og:url", content: "/termos" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/termos" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage
      title="Termos e Condições Gerais"
      updatedAt="26 de maio de 2026"
      intro={
        <>
          <p className="text-xs uppercase tracking-widest text-ink-soft">
            WayHome · Tomorrowland Brasil 2027
          </p>
          <p className="mt-3">
            Este Termo de Uso, Hospedagem e Participação estabelece as condições gerais
            da experiência <strong>WayHome</strong>, aplicáveis a todos os participantes
            que realizarem reserva, pagamento ou utilização dos serviços oferecidos pela
            marca WayHome. Ao concluir sua compra e aceitar eletronicamente este termo,
            o participante declara estar ciente e de acordo com todas as cláusulas
            abaixo.
          </p>
        </>
      }
      sections={[
        {
          id: "sobre",
          title: "1. Sobre a WayHome",
          body: (
            <p>
              A WayHome é uma experiência de hospedagem, translado e conexão criada para
              participantes do Tomorrowland Brasil. Mais do que uma hospedagem, a
              WayHome oferece estrutura, acolhimento, logística, alimentação,
              experiências coletivas e suporte operacional durante o período do evento.
            </p>
          ),
        },
        {
          id: "periodo",
          title: "2. Período da experiência",
          body: (
            <p>
              A experiência WayHome ocorrerá durante o período oficial do Tomorrowland
              Brasil 2027. Os horários de check-in, check-out, translados, refeições e
              demais atividades poderão sofrer ajustes operacionais conforme necessidade
              logística, trânsito, clima, hotel, festival ou segurança da operação.
            </p>
          ),
        },
        {
          id: "incluso",
          title: "3. O que está incluso",
          body: (
            <ul className="list-disc pl-5 space-y-1">
              <li>Hospedagem WayHome</li>
              <li>Translados oficiais</li>
              <li>Café da manhã</li>
              <li>Lanche noturno</li>
              <li>Kits exclusivos WayHome</li>
              <li>Brindes patrocinadores</li>
              <li>AFTERs WayHome</li>
              <li>Festa de iniciação</li>
              <li>Sorteios</li>
              <li>Experiências coletivas</li>
              <li>Área de convivência</li>
              <li>Suporte operacional da equipe</li>
              <li>Seguro e assistência conforme operação contratada</li>
            </ul>
          ),
        },
        {
          id: "quartos",
          title: "4. Estrutura dos quartos",
          body: (
            <>
              <p>
                Os quartos da WayHome poderão acomodar até <strong>8 (oito) participantes</strong>{" "}
                por unidade. Todos os quartos contam com:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Ar-condicionado</li>
                <li>Televisão</li>
                <li>Frigobar</li>
              </ul>
            </>
          ),
        },
        {
          id: "alimentacao",
          title: "5. Alimentação inclusa",
          body: (
            <>
              <div>
                <p className="font-semibold text-foreground">Lanche noturno</p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>Pão Pullman com patê</li>
                  <li>Pão Pullman com queijo e presunto</li>
                  <li>4 tipos de bolachas</li>
                  <li>Café, chá e suco de máquina</li>
                  <li>Bolo</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-foreground">Café da manhã</p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>Café, leite e chocolate</li>
                  <li>Queijo, presunto e mortadela</li>
                  <li>Salsicha ao molho</li>
                  <li>Pão francês e Pão Pullman</li>
                  <li>3 tipos de bolachas</li>
                  <li>Mamão e melão fatiados</li>
                  <li>Suco de máquina e chá</li>
                  <li>Ovos mexidos</li>
                </ul>
              </div>
              <p className="text-sm text-ink-soft">
                A WayHome poderá realizar ajustes pontuais no cardápio conforme
                disponibilidade operacional.
              </p>
            </>
          ),
        },
        {
          id: "translados",
          title: "6. Translados e horários",
          body: (
            <p>
              Os participantes deverão respeitar rigorosamente os horários definidos pela
              organização. A WayHome não se responsabiliza por perdas de translado
              decorrentes de atraso do participante.
            </p>
          ),
        },
        {
          id: "convivencia",
          title: "7. Regras de convivência",
          body: (
            <>
              <p>Não serão tolerados:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>agressões físicas ou verbais</li>
                <li>assédio</li>
                <li>discriminação</li>
                <li>vandalismo</li>
                <li>comportamento que coloque terceiros em risco</li>
                <li>descumprimento das orientações da equipe</li>
              </ul>
            </>
          ),
        },
        {
          id: "responsabilidade",
          title: "8. Responsabilidade do participante",
          body: (
            <>
              <p>O participante é integralmente responsável:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>por seus atos durante a experiência</li>
                <li>por objetos pessoais</li>
                <li>por documentos</li>
                <li>por danos causados ao hotel, ônibus, quartos, chalés ou equipamentos</li>
              </ul>
            </>
          ),
        },
        {
          id: "cancelamento",
          title: "9. Política de cancelamento",
          body: (
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Até 60 dias antes do evento:</strong> 100% em crédito WayHome.</li>
              <li><strong>Entre 59 e 30 dias antes:</strong> 50% em crédito WayHome.</li>
              <li><strong>Menos de 30 dias:</strong> sem reembolso ou crédito.</li>
            </ul>
          ),
        },
        {
          id: "seguro",
          title: "10. Seguro e assistência",
          body: (
            <>
              <p>
                A WayHome poderá disponibilizar seguro viagem, assistência médica e
                suporte emergencial conforme estrutura operacional contratada. As
                coberturas seguirão as regras da seguradora responsável.
              </p>
              <p>
                O participante declara ciência de que o seguro não substitui plano de
                saúde particular.
              </p>
            </>
          ),
        },
        {
          id: "saude",
          title: "11. Condições de saúde",
          body: (
            <p>
              O participante declara estar ciente de suas condições físicas e de saúde,
              responsabilizando-se por sua aptidão para participação na experiência. Em
              caso de emergência médica, a WayHome poderá acionar atendimento médico,
              ambulância, hospital ou suporte emergencial.
            </p>
          ),
        },
        {
          id: "ilicitas",
          title: "12. Substâncias ilícitas e condutas ilegais",
          body: (
            <p>
              A WayHome não compactua com atividades ilegais, sendo proibido qualquer
              comportamento que viole a legislação brasileira. A organização poderá
              remover imediatamente participantes que coloquem em risco a segurança ou
              legalidade da experiência.
            </p>
          ),
        },
        {
          id: "objetos",
          title: "13. Objetos pessoais",
          body: (
            <p>
              Cada participante é integralmente responsável por seus objetos pessoais
              durante toda a experiência. Objetos encontrados poderão ser armazenados
              temporariamente pela organização, sem obrigação de guarda permanente.
            </p>
          ),
        },
        {
          id: "forca-maior",
          title: "14. Força maior",
          body: (
            <>
              <p>
                A WayHome não será responsabilizada por atrasos, alterações ou
                cancelamentos decorrentes de:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>condições climáticas extremas</li>
                <li>acidentes</li>
                <li>bloqueios de estrada</li>
                <li>problemas mecânicos</li>
                <li>decisões governamentais</li>
                <li>alterações do festival</li>
              </ul>
            </>
          ),
        },
        {
          id: "idade",
          title: "15. Idade mínima",
          body: (
            <p>
              A experiência WayHome é destinada exclusivamente para maiores de 18 anos,
              salvo autorização expressa da organização.
            </p>
          ),
        },
        {
          id: "titularidade",
          title: "16. Troca de titularidade",
          body: (
            <p>
              Solicitações de transferência ou troca de titularidade poderão ser
              analisadas pela WayHome conforme disponibilidade operacional.
            </p>
          ),
        },
        {
          id: "imagem",
          title: "17. Direito de imagem",
          body: (
            <p>
              Ao participar da experiência WayHome, o participante autoriza
              gratuitamente o uso de sua imagem, voz e nome em fotos, vídeos, campanhas,
              redes sociais e materiais promocionais.
            </p>
          ),
        },
        {
          id: "limitacao",
          title: "18. Limitação de responsabilidade",
          body: (
            <>
              <p>A WayHome não se responsabiliza por:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>furtos</li>
                <li>perdas de objetos pessoais</li>
                <li>acidentes causados por terceiros</li>
                <li>cancelamentos do festival</li>
                <li>alterações climáticas</li>
              </ul>
            </>
          ),
        },
        {
          id: "aceite",
          title: "19. Aceite digital",
          body: (
            <p>
              Ao concluir a compra e selecionar a opção{" "}
              <em>“Li e concordo com os Termos e Condições da WayHome”</em>, o
              participante declara ciência e concordância integral com todas as
              cláusulas deste documento.
            </p>
          ),
        },
        {
          id: "foro",
          title: "20. Foro",
          body: (
            <>
              <p>
                Fica eleito o Foro da Comarca de <strong>São Paulo/SP</strong> para
                dirimir quaisquer dúvidas relacionadas a este termo.
              </p>
              <div className="mt-6 rounded-2xl border border-border bg-muted/40 p-5 text-center">
                <p className="text-xs uppercase tracking-widest text-brand font-bold">
                  WayHome — Tomorrowland Brasil 2027
                </p>
                <p className="mt-2 font-display text-lg italic text-foreground">
                  “Você não está longe de casa. Você está voltando para casa.”
                </p>
              </div>
            </>
          ),
        },
      ]}
    />
  );
}