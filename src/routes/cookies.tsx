import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Política de Cookies — Way Home" },
      { name: "description", content: "Como a Way Home usa cookies e como você pode gerenciar suas preferências." },
      { property: "og:title", content: "Política de Cookies — Way Home" },
      { property: "og:description", content: "Como a Way Home usa cookies e como você pode gerenciar suas preferências." },
      { property: "og:url", content: "/cookies" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/cookies" }],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <LegalPage
      title="Política de Cookies"
      updatedAt="12 de maio de 2026"
      intro={<p>Esta política descreve como o site da Way Home utiliza cookies e tecnologias similares.</p>}
      sections={[
        {
          id: "o-que-sao",
          title: "1. O que são cookies",
          body: <p>Cookies são pequenos arquivos armazenados no seu navegador para lembrar preferências, manter sessões ativas e medir o uso do site.</p>,
        },
        {
          id: "categorias",
          title: "2. Categorias que usamos",
          body: (
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Essenciais:</strong> autenticação, segurança contra força bruta e carrinho. Não podem ser desativados.</li>
              <li><strong>Preferências:</strong> tema (claro/escuro), idioma e configurações da sua conta.</li>
              <li><strong>Analytics:</strong> métricas anônimas de uso para melhorar o site.</li>
            </ul>
          ),
        },
        {
          id: "gerenciar",
          title: "3. Como gerenciar",
          body: (
            <p>
              Você pode aceitar, recusar ou apagar cookies pelas configurações do seu navegador.
              Recusar cookies essenciais pode impedir o funcionamento de partes do site (como
              login e checkout).
            </p>
          ),
        },
        {
          id: "contato",
          title: "4. Contato",
          body: <p>Dúvidas: <a className="text-brand underline-offset-4 hover:underline" href="mailto:wayhomeoficial@gmail.com">wayhomeoficial@gmail.com</a>.</p>,
        },
      ]}
    />
  );
}