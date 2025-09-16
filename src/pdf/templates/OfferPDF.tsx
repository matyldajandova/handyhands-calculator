export type OfferData = {
  quoteDate: string;
  price: number;
  startDate: string;
  customer: { name: string; address?: string; email?: string };
  // List bullets for quick summary (e.g., services selected)
  tasks?: string[];
  // Key-value summary of answers from the form
  summaryItems?: { label: string; value: string }[];
};
/**
 * Returns the HTML body markup for the Offer PDF using Tailwind classes.
 * We avoid JSX/react-dom usage so this can be safely called from a Route Handler.
 */
export function renderOfferPdfBody(data: OfferData): string {
  const tasksHtml = (data.tasks?.length ?? 0)
    ? `
      <div class="page-break"></div>
      <section class="mt-2">
        <div class="text-xl font-bold">3. Shrnutí - rozsah a specifikace pracovních úkonů</div>
        <div class="hh-divider mt-2"></div>
        <div class="hh-small hh-muted mt-2">Zadané údaje:</div>
        <ul class="list-disc pl-6 mt-2">
          ${data.tasks!.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}
        </ul>

        ${renderSummaryItems(data.summaryItems)}
      </section>

      <section class="hh-section">
        <div class="text-xl font-bold">4. Proč si vybrat právě nás? - klíčové benefity úklidové služby HandyHands</div>
        <div class="hh-divider mt-2"></div>
        
        <div class="grid grid-cols-2 gap-6 mt-6">
          <div class="hh-card">
            <div class="hh-card-title">20 let</div>
            <div class="hh-card-subtitle">zkušeností s úklidovými službami</div>
          </div>
          <div class="hh-card">
            <div class="hh-card-title">5 mil. Kč</div>
            <div class="hh-card-subtitle">pojištění odpovědnosti za způsobené škody</div>
          </div>
        </div>

        <div class="hh-benefits">
          <div class="hh-benefit-item">
            <div class="hh-benefit-title">Zkušenosti s úklidovými službami již 20 let</div>
            <div class="hh-benefit-text">Naše dlouholeté působení na trhu je zárukou profesionálního přístupu, osvědčených postupů a stabilního týmu. Víme, jak zajistit maximální kvalitu a spokojenost našich klientů.</div>
          </div>
          <div class="hh-benefit-item">
            <div class="hh-benefit-title">Prověření a kvalifikovaní pracovníci</div>
            <div class="hh-benefit-text">Naši pracovníci jsou pečlivě prověřeni, jsou spolehliví, dochvilní a prošli důkladným školením. Můžete se na ně plně spolehnout, že odvedou svoji práci na 100 %.</div>
          </div>
          <div class="hh-benefit-item">
            <div class="hh-benefit-title">Garance kvality a spolehlivosti</div>
            <div class="hh-benefit-text">Dbáme na nejvyšší standardy úklidu, používáme kvalitní čisticí prostředky a moderní vybavení. Váš prostor bude vždy čistý, upravený a voňavý. Také Vaše zpětná vazba je pro nás velmi důležitá.</div>
          </div>
          <div class="hh-benefit-item">
            <div class="hh-benefit-title">Flexibilita a individuální přístup</div>
            <div class="hh-benefit-text">Chápeme, že každý klient má jiné požadavky. Nabízíme pravidelné či nepravidelné úklidy, přizpůsobíme se Vám podle rozvrhu a potřeb. Můžete si vybrat termíny i rozsah služeb, jak Vám to nejvíce vyhovuje.</div>
          </div>
          <div class="hh-benefit-item">
            <div class="hh-benefit-title">Pojištění do výše 5 mil. Kč a jistota</div>
            <div class="hh-benefit-text">Veškeré naše práce jsou kryty pojištěním, což zajišťuje ochranu Vašeho majetku a absolutní klid na duši. Při jakékoliv nečekané události za nás ručíme.</div>
          </div>
          <div class="hh-benefit-item">
            <div class="hh-benefit-title">Zákaznická spokojenost na prvním místě</div>
            <div class="hh-benefit-text">Naším cílem je vybudovat dlouhodobé vztahy založené na důvěře, profesionalitě a individuálním přístupu. Vaše spokojenost je pro nás vždy na prvním místě.</div>
          </div>
        </div>
      </section>

          <div class="page-break"></div>
          <section class="hh-section">
            <div class="text-xl font-bold">Destatero HandyHands</div>
            <div class="hh-divider mt-2"></div>
            <ol class="list-decimal pl-6 mt-4 space-y-2">
              <li><strong>Platí to, na čem se dohodneme</strong> – Pečlivě se věnujeme Vašim požadavkům a zavazujeme se k dodržování dohodnutých podmínek.</li>
              <li><strong>Spokojenost zákazníků je pro nás klíčová</strong> – Usilujeme o Vaši maximální spokojenost a komfort.</li>
              <li><strong>Zajišťujeme stálost Vašeho úklidového pracovníka</strong> – Upřednostňujeme stabilního pracovníka, s případnou minimální změnou, a v případě absence rychle zajistíme náhradního.</li>
              <li><strong>Naši pracovníci fungují samostatně</strong> – Jsou aktivní, samostatní a nevyžadují neustálé řízení, ale v případě potřeby Vás kontaktují a upozorní na nedostatky.</li>
              <li><strong>Komunikace a upozornění na nedostatky</strong> – Pokud objevíme jakékoli problémy, včas Vás informujeme a po vzájemné dohodě je odstraníme.</li>
              <li><strong>Máme přehled o aktuálním stavu prostor</strong> – Sledujeme a známe stav prostor určených k úklidu, aby byla zajištěna kvalita práce.</li>
              <li><strong>Udržujeme prostory v dlouhodobé čistotě</strong> – Dbáme na to, aby byly prostory udržovány ve stavu přiměřené čistoty i v dlouhodobém horizontu.</li>
              <li><strong>Respektujeme Vaše prostředí a pravidla</strong> – Chováme se s úctou k Vašim prostorům a dodržujeme všechny stanovené bezpečnostní a hygienické normy.</li>
              <li><strong>Flexibilita a vstřícnost</strong> – Přizpůsobíme se Vašim časovým požadavkům a specifikacím.</li>
              <li><strong>Profesionalita a důvěra</strong> – Garantujeme kvalitní služby, poctivost a důvěrnost Vašich informací.</li>
            </ol>
            <p class="mt-6 hh-small hh-muted"><strong>Všechny požadavky a reklamace se vyřizují pouze online nebo telefonicky.</strong> Toto je důležité pravidlo a je uvedeno ve všech cenových nabídkách (web, PDF atd.); zákazník s ním musí při objednávce souhlasit.</p>
          </section>
    `
    : "";

  return `
    <section>
      <div class="text-3xl font-bold text-foreground">Cenová nabídka úklidových služeb</div>
      <p class="text-muted-foreground">poskytnutá na základě vyplnění poptávkového formuláře ze dne ${escapeHtml(data.quoteDate)}</p>
    </section>

    <section class="mt-6">
      <div class="font-bold">1. Identifikace a kontaktní údaje</div>
      <div class="hh-divider mt-2"></div>
      <div class="grid grid-cols-2 gap-6 mt-4">
        <div>
          <div class="font-semibold">Údaje o Vás:</div>
          <div>${escapeHtml(data.customer.name)}</div>
          ${data.customer.address ? `<div>${escapeHtml(data.customer.address)}</div>` : ""}
          ${data.customer.email ? `<div>${escapeHtml(data.customer.email)}</div>` : ""}
        </div>
        <div>
          <div class="font-semibold">Údaje o nás:</div>
          <div>HandyHands, s.r.o.</div>
          <div>info@handyhands.cz</div>
        </div>
      </div>
    </section>

    <section class="mt-8">
      <div class="font-bold">2. Celková cena pravidelného úklidu</div>
      <div class="hh-divider mt-2"></div>
      <div class="grid grid-cols-2 gap-6 mt-6">
        <div>
          <div class="text-2xl font-bold text-primary">${Number(data.price).toLocaleString("cs-CZ")} Kč / měsíc</div>
          <div class="text-muted-foreground">Celková částka pravidelného úklidu bytového domu</div>
          <div class="hh-small hh-muted">(tj. včetně níže popsaných náležitostí)</div>
        </div>
        <div>
          <div class="text-2xl font-bold">${escapeHtml(data.startDate)}</div>
          <div class="text-muted-foreground">S úklidovými službami jsme schopni začít od tohoto dne</div>
        </div>
      </div>
      <p class="mt-6 hh-muted hh-small">Cena obsahuje pravidelný týdenní, měsíční a generální úklid 2x ročně, dopravu pracovníků na místo úklidových prací, pojištění odpovědnosti do výše 5 mil. Kč, běžné úklidové prostředky a vlastní úklidové náčiní.</p>
      <p class="hh-muted hh-small">Ostatní práce nad rámec smlouvy (např. úklid po řemeslnících, výjezd na vyžádání apod.): 345 Kč / hod. za pracovníka.</p>
      <p class="hh-muted hh-small">Nejsme plátci DPH.</p>

      <p class="mt-6 hh-muted">Úklidové práce provádějí vždy naši stálí pracovníci.</p>
      <p class="hh-muted">V případě dotazů nebo nejasností se na nás neváhejte obrátit.</p>
      <p class="mt-4">V Praze, dne ${escapeHtml(data.quoteDate)}</p>

      <div class="grid grid-cols-2 gap-12 hh-signature-block">
        <div>
          <img src="signature-lenka.svg" alt="Podpis Lenka Krátká" style="width: 120px; height: 40px; margin-bottom: 8px;" />
          <div class="hh-signature-line"></div>
          <div class="hh-sign-name">Lenka Krátká</div>
          <div class="hh-small hh-muted">Regionální manažer pravidelných úklidů</div>
        </div>
        <div>
          <img src="signature-jana.svg" alt="Podpis Jana Dvořáková" style="width: 120px; height: 40px; margin-bottom: 8px;" />
          <div class="hh-signature-line"></div>
          <div class="hh-sign-name">Jana Dvořáková</div>
          <div class="hh-small hh-muted">Jednatel HandyHands, s.r.o.</div>
        </div>
      </div>

      <p class="mt-6 hh-note">Pozn.: tato nabídka je nezávazná a slouží pouze k poskytnutí předběžné informace. Vypracování konečné nabídky a realizace služeb je podmíněná vzájemnou dohodou a potvrzením objednávky. Nemáme žádnou právní povinnost akceptovat nebo realizovat nabízené služby na základě této nabídky.</p>
    </section>
    ${tasksHtml}
  `;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderSummaryItems(items?: { label: string; value: string }[]): string {
  if (!items || items.length === 0) return "";
  const rows = items
    .map((i) => `<div class=\"grid grid-cols-[1fr_auto] gap-2\"><span>${escapeHtml(i.label)}</span><span class=\"justify-self-end\">${escapeHtml(i.value)}</span></div>`)
    .join("");
  return `<div class=\"mt-4 space-y-1 hh-small\">${rows}</div>`;
}


