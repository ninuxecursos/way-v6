import {
  BedDouble,
  Bus,
  Camera,
  FileCheck2,
  Heart,
  Home,
  Info,
  Landmark,
  ListChecks,
  Lock,
  Package,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserCog,
  Users,
  UtensilsCrossed,
  XCircle,
} from "lucide-react";

type SectionProps = {
  n: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
};

function Section({ n, icon: Icon, title, children }: SectionProps) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-foreground">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 text-brand">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="text-muted-foreground tabular-nums">{String(n).padStart(2, "0")}.</span>
        <span>{title}</span>
      </h3>
      <div className="space-y-2 pl-8 text-[13.5px] leading-relaxed text-foreground/85">
        {children}
      </div>
    </section>
  );
}

function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 marker:text-brand">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

export function TermsContent() {
  return (
    <article className="space-y-6">
      <header className="rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-[11px] uppercase tracking-widest text-brand font-bold">
          WayHome · Tomorrowland Brasil 2027
        </p>
        <h2 className="mt-1 font-display text-lg font-bold text-foreground">
          Termos e Condições Gerais
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-foreground/80">
          Este Termo de Uso, Hospedagem e Participação estabelece as condições gerais
          da experiência <strong>WayHome</strong>. Ao concluir sua compra e aceitar
          eletronicamente este termo, você declara estar ciente e de acordo com todas
          as cláusulas abaixo.
        </p>
      </header>

      <Section n={1} icon={Home} title="Sobre a WayHome">
        <p>
          A WayHome é uma experiência de hospedagem, translado e conexão criada para
          participantes do Tomorrowland Brasil. Mais do que uma hospedagem, oferece
          estrutura, acolhimento, logística, alimentação, experiências coletivas e
          suporte operacional durante o período do evento.
        </p>
      </Section>

      <Section n={2} icon={Info} title="Período da experiência">
        <p>
          A experiência ocorrerá durante o período oficial do Tomorrowland Brasil 2027.
          Horários de check-in, check-out, translados, refeições e demais atividades
          poderão sofrer ajustes operacionais conforme logística, trânsito, clima,
          hotel, festival ou segurança da operação.
        </p>
      </Section>

      <Section n={3} icon={ListChecks} title="O que está incluso">
        <Bullets
          items={[
            "Hospedagem WayHome",
            "Translados oficiais",
            "Café da manhã e lanche noturno",
            "Kits exclusivos WayHome e brindes patrocinadores",
            "AFTERs WayHome, festa de iniciação e sorteios",
            "Experiências coletivas e área de convivência",
            "Suporte operacional da equipe",
            "Seguro e assistência conforme operação contratada",
          ]}
        />
      </Section>

      <Section n={4} icon={BedDouble} title="Estrutura dos quartos">
        <p>
          Os quartos poderão acomodar até <strong>8 participantes</strong> por unidade,
          e contam com ar-condicionado, televisão e frigobar.
        </p>
      </Section>

      <Section n={5} icon={UtensilsCrossed} title="Alimentação inclusa">
        <p className="font-medium text-foreground">Lanche noturno</p>
        <Bullets
          items={[
            "Pão Pullman com patê",
            "Pão Pullman com queijo e presunto",
            "4 tipos de bolachas",
            "Café, chá e suco de máquina",
            "Bolo",
          ]}
        />
        <p className="font-medium text-foreground pt-1">Café da manhã</p>
        <Bullets
          items={[
            "Café, leite e chocolate",
            "Queijo, presunto e mortadela",
            "Salsicha ao molho",
            "Pão francês e Pão Pullman",
            "3 tipos de bolachas",
            "Mamão e melão fatiados",
            "Suco de máquina e chá",
            "Ovos mexidos",
          ]}
        />
        <p className="text-[12px] text-muted-foreground">
          A WayHome poderá realizar ajustes pontuais no cardápio conforme
          disponibilidade operacional.
        </p>
      </Section>

      <Section n={6} icon={Bus} title="Translados e horários">
        <p>
          Os participantes deverão respeitar rigorosamente os horários definidos pela
          organização. A WayHome não se responsabiliza por perdas de translado
          decorrentes de atraso do participante.
        </p>
      </Section>

      <Section n={7} icon={Users} title="Regras de convivência">
        <p>Não serão tolerados:</p>
        <Bullets
          items={[
            "agressões físicas ou verbais",
            "assédio",
            "discriminação",
            "vandalismo",
            "comportamento que coloque terceiros em risco",
            "descumprimento das orientações da equipe",
          ]}
        />
      </Section>

      <Section n={8} icon={UserCheck} title="Responsabilidade do participante">
        <p>O participante é integralmente responsável:</p>
        <Bullets
          items={[
            "por seus atos durante a experiência",
            "por objetos pessoais e documentos",
            "por danos causados ao hotel, ônibus, quartos, chalés ou equipamentos",
          ]}
        />
      </Section>

      <Section n={9} icon={XCircle} title="Política de cancelamento">
        <Bullets
          items={[
            <>
              <strong>Até 60 dias antes do evento:</strong> 100% em crédito WayHome.
            </>,
            <>
              <strong>Entre 59 e 30 dias antes:</strong> 50% em crédito WayHome.
            </>,
            <>
              <strong>Menos de 30 dias:</strong> sem reembolso ou crédito.
            </>,
          ]}
        />
      </Section>

      <Section n={10} icon={ShieldCheck} title="Seguro e assistência">
        <p>
          A WayHome poderá disponibilizar seguro viagem, assistência médica e suporte
          emergencial conforme estrutura operacional contratada. As coberturas seguirão
          as regras da seguradora responsável. O seguro não substitui plano de saúde
          particular.
        </p>
      </Section>

      <Section n={11} icon={Heart} title="Condições de saúde">
        <p>
          O participante declara estar ciente de suas condições físicas e de saúde,
          responsabilizando-se por sua aptidão para a experiência. Em emergência médica,
          a WayHome poderá acionar atendimento médico, ambulância, hospital ou suporte
          emergencial.
        </p>
      </Section>

      <Section n={12} icon={ShieldAlert} title="Substâncias ilícitas e condutas ilegais">
        <p>
          A WayHome não compactua com atividades ilegais, sendo proibido qualquer
          comportamento que viole a legislação brasileira. A organização poderá remover
          imediatamente participantes que coloquem em risco a segurança ou legalidade
          da experiência.
        </p>
      </Section>

      <Section n={13} icon={Package} title="Objetos pessoais">
        <p>
          Cada participante é integralmente responsável por seus objetos pessoais.
          Objetos encontrados poderão ser armazenados temporariamente pela organização,
          sem obrigação de guarda permanente.
        </p>
      </Section>

      <Section n={14} icon={Lock} title="Força maior">
        <p>
          A WayHome não será responsabilizada por atrasos, alterações ou cancelamentos
          decorrentes de condições climáticas extremas, acidentes, bloqueios de estrada,
          problemas mecânicos, decisões governamentais ou alterações do festival.
        </p>
      </Section>

      <Section n={15} icon={UserCog} title="Idade mínima">
        <p>
          A experiência é destinada exclusivamente para maiores de <strong>18 anos</strong>,
          salvo autorização expressa da organização.
        </p>
      </Section>

      <Section n={16} icon={Sparkles} title="Troca de titularidade">
        <p>
          Solicitações de transferência ou troca de titularidade poderão ser analisadas
          pela WayHome conforme disponibilidade operacional.
        </p>
      </Section>

      <Section n={17} icon={Camera} title="Direito de imagem">
        <p>
          Ao participar da experiência, o participante autoriza gratuitamente o uso de
          sua imagem, voz e nome em fotos, vídeos, campanhas, redes sociais e materiais
          promocionais.
        </p>
      </Section>

      <Section n={18} icon={Scale} title="Limitação de responsabilidade">
        <p>A WayHome não se responsabiliza por:</p>
        <Bullets
          items={[
            "furtos",
            "perdas de objetos pessoais",
            "acidentes causados por terceiros",
            "cancelamentos do festival",
            "alterações climáticas",
          ]}
        />
      </Section>

      <Section n={19} icon={FileCheck2} title="Aceite digital">
        <p>
          Ao concluir a compra e marcar a opção{" "}
          <em>“Li e concordo com os Termos e Condições da WayHome”</em>, você declara
          ciência e concordância integral com todas as cláusulas deste documento.
        </p>
      </Section>

      <Section n={20} icon={Landmark} title="Foro">
        <p>
          Fica eleito o Foro da Comarca de <strong>São Paulo/SP</strong> para dirimir
          quaisquer dúvidas relacionadas a este termo.
        </p>
      </Section>

      <div className="rounded-2xl border border-border bg-gradient-to-br from-brand/5 to-transparent p-5 text-center">
        <p className="text-[11px] uppercase tracking-widest text-brand font-bold">
          WayHome — Tomorrowland Brasil 2027
        </p>
        <p className="mt-2 font-display text-base italic text-foreground">
          “Você não está longe de casa. Você está voltando para casa.”
        </p>
      </div>

      <p className="pt-1 text-center text-[11px] uppercase tracking-wider text-muted-foreground/70">
        — Fim dos termos —
      </p>
    </article>
  );
}