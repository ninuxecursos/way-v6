import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/direito-de-imagem")({
  head: () => ({
    meta: [
      { title: "Direito de Imagem — Way Home" },
      { name: "description", content: "Termos sobre uso de imagens e vídeos captados durante a hospedagem e o festival." },
      { property: "og:title", content: "Direito de Imagem — Way Home" },
      { property: "og:description", content: "Termos sobre uso de imagens e vídeos captados durante a hospedagem e o festival." },
      { property: "og:url", content: "/direito-de-imagem" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/direito-de-imagem" }],
  }),
  component: ImageRightsPage,
});

function ImageRightsPage() {
  return (
    <LegalPage
      title="Política de Direito de Imagem"
      updatedAt="12 de maio de 2026"
      intro={
        <p>
          Durante a estadia, atividades, transfers e o evento podemos registrar fotos e
          vídeos para divulgação institucional da Way Home. Este documento explica como
          esse material é tratado.
        </p>
      }
      sections={[
        {
          id: "autorizacao",
          title: "1. Autorização de uso",
          body: (
            <p>
              Ao adquirir o pacote e participar das atividades, você autoriza, em caráter
              gratuito e não exclusivo, o uso da sua imagem em fotos e vídeos para divulgação
              em redes sociais, site, materiais publicitários e relatórios institucionais
              da Way Home, no Brasil e no exterior.
            </p>
          ),
        },
        {
          id: "usos",
          title: "2. Onde podemos publicar",
          body: (
            <p>
              Instagram (@wayhomeoficial), site oficial, blog, materiais impressos, apresentações
              comerciais e ações de mídia paga vinculadas à marca Way Home.
            </p>
          ),
        },
        {
          id: "limites",
          title: "3. Limites de uso",
          body: (
            <ul className="list-disc pl-5 space-y-1">
              <li>Não usaremos imagens em contextos que exponham, constranjam ou ofendam o titular.</li>
              <li>Não comercializaremos imagens isoladas para terceiros sem novo consentimento expresso.</li>
              <li>Crianças e adolescentes só são fotografados mediante autorização do responsável.</li>
            </ul>
          ),
        },
        {
          id: "oposicao",
          title: "4. Direito de oposição e remoção",
          body: (
            <p>
              Você pode, a qualquer momento, solicitar a remoção do material em que aparece,
              enviando o pedido para <a className="text-brand underline-offset-4 hover:underline" href="mailto:wayhomeoficial@gmail.com">wayhomeoficial@gmail.com</a>.
              Atenderemos no menor prazo razoável, observadas obrigações legais de retenção.
            </p>
          ),
        },
        {
          id: "propriedade",
          title: "5. Propriedade do material",
          body: <p>O material captado é de titularidade da Way Home, respeitados os direitos da personalidade dos retratados.</p>,
        },
      ]}
    />
  );
}