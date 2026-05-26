import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Way Home" },
      { name: "description", content: "Como a Way Home coleta, usa e protege seus dados pessoais conforme a LGPD." },
      { property: "og:title", content: "Política de Privacidade — Way Home" },
      { property: "og:description", content: "Como a Way Home coleta, usa e protege seus dados pessoais conforme a LGPD." },
      { property: "og:url", content: "/privacidade" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/privacidade" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage
      title="Política de Privacidade"
      updatedAt="12 de maio de 2026"
      intro={
        <p>
          A Way Home — Sua Casa no Tomorrowland Brasil valoriza a privacidade
          de seus clientes. Esta política explica quais dados coletamos, como os usamos
          e quais são os seus direitos como titular, em conformidade com a Lei Geral
          de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
        </p>
      }
      sections={[
        {
          id: "dados",
          title: "1. Dados que coletamos",
          body: (
            <>
              <p>Coletamos, conforme o seu uso do site:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Cadastro:</strong> nome, e-mail, telefone, CPF e senha.</li>
                <li><strong>Compras:</strong> dados do pacote, valores, comprovantes e histórico de pedidos.</li>
                <li><strong>Pagamento:</strong> dados processados diretamente pelos gateways (Mercado Pago e parceiros). Não armazenamos número completo de cartão.</li>
                <li><strong>Comunicação:</strong> mensagens trocadas via WhatsApp, e-mail e formulários.</li>
                <li><strong>Navegação:</strong> cookies, IP, dispositivo e páginas visitadas.</li>
              </ul>
            </>
          ),
        },
        {
          id: "finalidade",
          title: "2. Finalidade do tratamento",
          body: (
            <>
              <p>Usamos seus dados para:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Processar pedidos, emissão de recibos e notas fiscais (NF-e/NFS-e).</li>
                <li>Prestar atendimento e suporte antes, durante e após o evento.</li>
                <li>Enviar comunicações sobre sua reserva e atualizações de serviço.</li>
                <li>Cumprir obrigações legais, fiscais e regulatórias (Cadastur, Receita Federal).</li>
                <li>Prevenir fraudes e proteger a segurança dos hóspedes e do patrimônio.</li>
              </ul>
            </>
          ),
        },
        {
          id: "base-legal",
          title: "3. Base legal",
          body: (
            <p>
              Tratamos dados com base em: execução de contrato (art. 7º, V LGPD), cumprimento de
              obrigação legal (art. 7º, II), legítimo interesse (art. 7º, IX) e seu consentimento
              (art. 7º, I) quando aplicável (ex.: marketing).
            </p>
          ),
        },
        {
          id: "compartilhamento",
          title: "4. Compartilhamento",
          body: (
            <>
              <p>Compartilhamos dados estritamente necessários com:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Gateways de pagamento (Mercado Pago e parceiros homologados).</li>
                <li>Provedores de e-mail transacional e infraestrutura em nuvem (Supabase).</li>
                <li>Parceiros de transporte e hospedagem para execução do pacote.</li>
                <li>Autoridades públicas, quando exigido por lei.</li>
              </ul>
              <p>Não vendemos seus dados a terceiros.</p>
            </>
          ),
        },
        {
          id: "retencao",
          title: "5. Retenção",
          body: (
            <p>
              Mantemos seus dados pelo prazo necessário ao cumprimento das finalidades acima
              e das obrigações fiscais (mínimo 5 anos para documentos contábeis). Após isso,
              os dados são anonimizados ou excluídos.
            </p>
          ),
        },
        {
          id: "direitos",
          title: "6. Seus direitos",
          body: (
            <>
              <p>Você pode, a qualquer momento, solicitar:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Confirmação e acesso aos seus dados.</li>
                <li>Correção de dados incompletos ou desatualizados.</li>
                <li>Anonimização, bloqueio ou eliminação de dados desnecessários.</li>
                <li>Portabilidade dos dados.</li>
                <li>Revogação do consentimento.</li>
              </ul>
              <p>Solicite pelo e-mail <a className="text-brand underline-offset-4 hover:underline" href="mailto:wayhomeoficial@gmail.com">wayhomeoficial@gmail.com</a>.</p>
            </>
          ),
        },
        {
          id: "seguranca",
          title: "7. Segurança",
          body: (
            <p>
              Adotamos medidas técnicas e administrativas para proteger seus dados:
              criptografia em trânsito (HTTPS), controle de acesso por papéis (RBAC),
              proteção contra força bruta no login e auditoria de operações sensíveis.
            </p>
          ),
        },
        {
          id: "encarregado",
          title: "8. Encarregado pelos dados (DPO)",
          body: (
            <p>
              Contato do encarregado: <a className="text-brand underline-offset-4 hover:underline" href="mailto:wayhomeoficial@gmail.com">wayhomeoficial@gmail.com</a>.
            </p>
          ),
        },
      ]}
    />
  );
}