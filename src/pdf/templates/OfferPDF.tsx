export type OfferData = {
  quoteDate: string;
  price: number;
  startDate: string;
  // Human-readable service title (e.g., form title) – used for Drive subfolder naming
  serviceTitle?: string;
  customer: { name: string; address?: string; email?: string; phone?: string };
  company: { name: string; address: string; ico: string; registerInfo: string; email: string; phone: string };
  // List bullets for quick summary (e.g., services selected)
  tasks?: string[];
  // Key-value summary of answers from the form
  summaryItems?: { label: string; value: string }[];
  // Customer notes/comments
  notes?: string;
  // Poptávka-specific notes
  poptavkaNotes?: string;
  // Form conditions/requirements
  conditions?: string[];
  // Common services performed
  commonServices?: {
    weekly?: string[];
    monthly?: string[];
    biAnnual?: string[];
    perCleaning?: string[];
    generalCleaning?: string[];
  };
  // Hash for linking to poptavka form
  poptavkaHash?: string;
  // Flag to indicate if this is a poptavka submission (affects Google Drive folder)
  isPoptavka?: boolean;
  // General cleaning pricing (displayed separately)
  generalCleaningPrice?: number;
  generalCleaningFrequency?: string;
  // Winter maintenance pricing (displayed separately)
  winterServiceFee?: number;
  winterCalloutFee?: number;
  winterPeriod?: { start: { day: number; month: number }; end: { day: number; month: number } };
  // Hourly service information
  isHourlyService?: boolean;
  hourlyRate?: number;
  fixedAddons?: Array<{ label: string; amount: number }>;
  minimumHours?: number;
};
/**
 * Returns the HTML body markup for the Offer PDF using Tailwind classes.
 * We avoid JSX/react-dom usage so this can be safely called from a Route Handler.
 */
export function renderOfferPdfBody(data: OfferData, baseUrl?: string): string {
  const tasksHtml = (data.tasks?.length ?? 0) || (data.summaryItems?.length ?? 0)
    ? `
      <section class="mt-8" style="page-break-inside: avoid;">
        <div class="text-xl font-bold">3. Shrnutí - rozsah a specifikace pracovních úkonů</div>
        <div class="hh-divider mt-2"></div>      
        ${renderCompleteQATable(data.tasks, data.summaryItems)}
        
        ${renderNotesSection(data.notes)}
        ${renderCommonServicesSection(data.commonServices)}
      </section>

      <section class="hh-section mt-8">
        <div class="text-xl font-bold">4. Proč si vybrat právě nás?</div>
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
          <div class="hh-benefit-item" style="page-break-inside: avoid;">
            <div class="hh-benefit-title">Zkušenosti s úklidovými službami již 20 let</div>
            <div class="hh-benefit-text">Naše dlouholeté působení na trhu je zárukou profesionálního přístupu, osvědčených postupů a stabilního týmu. Víme, jak zajistit maximální kvalitu a spokojenost našich klientů.</div>
          </div>
          <div class="hh-benefit-item" style="page-break-inside: avoid;">
            <div class="hh-benefit-title">Prověření a kvalifikovaní pracovníci</div>
            <div class="hh-benefit-text">Naši pracovníci jsou pečlivě prověřeni, jsou spolehliví, dochvilní a prošli důkladným školením. Můžete se na ně plně spolehnout, že odvedou svoji práci na 100 %.</div>
          </div>
          <div class="hh-benefit-item" style="page-break-inside: avoid;">
            <div class="hh-benefit-title">Garance kvality a spolehlivosti</div>
            <div class="hh-benefit-text">Dbáme na nejvyšší standardy úklidu, používáme kvalitní čisticí prostředky a moderní vybavení. Váš prostor bude vždy čistý, upravený a voňavý. Také Vaše zpětná vazba je pro nás velmi důležitá.</div>
          </div>
          <div class="hh-benefit-item" style="page-break-inside: avoid;">
            <div class="hh-benefit-title">Flexibilita a individuální přístup</div>
            <div class="hh-benefit-text">Chápeme, že každý klient má jiné požadavky. Nabízíme pravidelné či nepravidelné úklidy, přizpůsobíme se Vám podle rozvrhu a potřeb. Můžete si vybrat termíny i rozsah služeb, jak Vám to nejvíce vyhovuje.</div>
          </div>
          <div class="hh-benefit-item" style="page-break-inside: avoid;">
            <div class="hh-benefit-title">Pojištění do výše 5 mil. Kč a jistota</div>
            <div class="hh-benefit-text">Veškeré naše práce jsou kryty pojištěním, což zajišťuje ochranu Vašeho majetku a absolutní klid na duši. Při jakékoliv nečekané události za nás ručíme.</div>
          </div>
          <div class="hh-benefit-item" style="page-break-inside: avoid;">
            <div class="hh-benefit-title">Zákaznická spokojenost na prvním místě</div>
            <div class="hh-benefit-text">Naším cílem je vybudovat dlouhodobé vztahy založené na důvěře, profesionalitě a individuálním přístupu. Vaše spokojenost je pro nás vždy na prvním místě.</div>
          </div>
        </div>
      </section>

      <section class="hh-section mt-8">
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
          ${data.customer.phone ? `<div>${escapeHtml(data.customer.phone)}</div>` : ""}
          ${(data.customer as Record<string, unknown>).company ? (() => {
            const company = (data.customer as Record<string, unknown>).company as Record<string, unknown>;
            return `
            <div class="mt-2">
              <div class="font-semibold">společnost:</div>
              <div>${escapeHtml(company.name as string || '')}</div>
              <div>IČO: ${escapeHtml(company.ico as string || '')}${company.dic ? `, DIČ: ${escapeHtml(company.dic as string || '')}` : ""}</div>
              <div>${escapeHtml(company.address as string || '')}</div>
            </div>
          `;
          })() : ""}
        </div>
        <div>
          <div class="font-semibold">Údaje o nás:</div>
          <div>HandyHands s.r.o.</div>
          <div>Jičínská 226/17, Žižkov, 130 00 Praha</div>
          <div>IČO: 08405867</div>
        </div>
      </div>
      ${data.poptavkaNotes ? `
        <div class="mt-2">
          <div><span class="font-semibold">Poznámka k poptávce:</span> ${escapeHtml(data.poptavkaNotes)}</div>
        </div>
      ` : ""}
    </section>

    <section class="mt-6">
      <div class="font-bold">2. ${data.isHourlyService ? 'Cena služby' : 'Celková cena pravidelného úklidu'}</div>
      <div class="hh-divider mt-1"></div>
      
      <!-- Main pricing section -->
      <div class="mt-4">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
          <div>
            ${data.isHourlyService ? `
              <div class="text-2xl font-bold text-primary-pdf">${Number(data.hourlyRate || data.price).toLocaleString("cs-CZ")} Kč <span style="color: #000000; font-weight: normal;">/hod/pracovník</span></div>
              <div class="text-muted-foreground mt-2 italic">Minimální délka ${data.serviceTitle === 'Jednorázový úklid' ? 'úklidu' : 'mytí oken'} je ${data.minimumHours} hod. práce</div>
            ` : `
              <div class="text-2xl font-bold text-primary-pdf">${Number(data.price).toLocaleString("cs-CZ")} Kč <span style="color: #000000; font-weight: normal;">za měsíc</span></div>
              <div class="text-muted-foreground">Celková částka pravidelného úklidu bytového domu</div>
              <div class="hh-small hh-muted">(tj. včetně níže popsaných náležitostí)</div>
            `}
            <div class="text-muted-foreground" style="font-size: 14px; margin-top: 8px;">S úklidovými službami jsme schopni začít od <span style="font-weight: bold;">${escapeHtml(data.startDate)}</span></div>
          </div>
          ${data.poptavkaHash ? `
            <div>
              <a href="${baseUrl}/poptavka?hash=${escapeHtml(data.poptavkaHash)}" 
                 style="display: inline-block; padding: 8px 16px; background-color: #f6a85a; border: 2px solid #f6a85a; border-radius: 4px; text-decoration: none; font-weight: bold; color: #000000; font-size: 14px;">
                Závazná poptávka
              </a>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Extra položky section for hourly services -->
      ${data.isHourlyService && data.fixedAddons && data.fixedAddons.length > 0 ? `
        <div class="mt-4" style="display: flex; gap: 12px; flex-wrap: wrap;">
          ${data.fixedAddons.map(addon => `
            <div style="flex: 1; min-width: 200px; padding: 8px; background-color: #ffffff; border: 1px solid #D4D4D4; border-radius: 4px; position: relative;">
              <div style="position: absolute; top: -8px; left: 50%; transform: translateX(-50%); background-color: #2e2e2e; border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center;">
                <span style="color: #ffffff; font-size: 12px; font-weight: bold; line-height: 1;">+</span>
              </div>
              <div style="text-align: center; padding-top: 4px;">
                <div style="font-size: 12px; font-weight: 600; color: #2e2e2e; margin-bottom: 4px;">
                  ${escapeHtml(addon.label)}
                </div>
                <div style="font-size: 16px; font-weight: bold; color: #2e2e2e;">${addon.amount} Kč</div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Additional services - compact horizontal layout -->
      ${data.generalCleaningPrice || data.winterServiceFee ? `
        <div class="mt-4" style="display: flex; gap: 12px; flex-wrap: wrap;">
          ${data.generalCleaningPrice ? `
            <div style="${data.winterServiceFee ? 'flex: 1; min-width: 200px;' : 'width: 100%;'} padding: 8px; background-color: #ffffff; border: 1px solid #D4D4D4; border-radius: 4px; position: relative;">
              <div style="position: absolute; top: -8px; left: 50%; transform: translateX(-50%); background-color: #2e2e2e; border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center;">
                <span style="color: #ffffff; font-size: 12px; font-weight: bold; line-height: 1;">+</span>
              </div>
              <div style="text-align: center; padding-top: 4px;">
                <div style="font-size: 12px; font-weight: 600; color: #2e2e2e; margin-bottom: 4px;">
                  ✨ Generální úklid domu
                </div>
                <div style="font-size: 16px; font-weight: bold; color: #2e2e2e;">${Math.round(data.generalCleaningPrice / 10) * 10} Kč</div>
                <div style="font-size: 10px; color: #525252;">${data.generalCleaningFrequency || ''} za každý provedený úklid</div>
              </div>
            </div>
          ` : ''}
          
          ${data.winterServiceFee ? `
            <div style="${data.generalCleaningPrice ? 'flex: 1; min-width: 200px;' : 'width: 100%;'} padding: 8px; background-color: #ffffff; border: 1px solid #D4D4D4; border-radius: 4px; position: relative;">
              <div style="position: absolute; top: -8px; left: 50%; transform: translateX(-50%); background-color: #2e2e2e; border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center;">
                <span style="color: #ffffff; font-size: 12px; font-weight: bold; line-height: 1;">+</span>
              </div>
              <div style="text-align: center; padding-top: 4px;">
                <div style="font-size: 12px; font-weight: 600; color: #2e2e2e; margin-bottom: 4px;">
                  ❄️ Zimní údržba
                </div>
                ${data.generalCleaningPrice ? `
                  <!-- Side-by-side layout when general cleaning is present -->
                  <div style="font-size: 16px; font-weight: bold; color: #2e2e2e;">${data.winterServiceFee} Kč měsíčně</div>
                  <div style="font-size: 10px; color: #525252;">
                    Pohotovost ${data.winterPeriod ? `od ${data.winterPeriod.start.day}.${data.winterPeriod.start.month}. do ${data.winterPeriod.end.day}.${data.winterPeriod.end.month}.` : '(Nov 15 - Mar 14)'}
                  </div>
                  ${data.winterCalloutFee ? `
                    <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #D4D4D4;">
                      <div style="font-size: 14px; font-weight: bold; color: #2e2e2e;">${data.winterCalloutFee} Kč za výjezd</div>
                      <div style="font-size: 10px; color: #525252;">Cena je včetně posypového materiálu</div>
                    </div>
                  ` : ''}
                ` : `
                  <!-- Column layout when only winter cleaning is present -->
                  <div style="display: flex; gap: 12px;">
                    <div style="flex: 1;">
                      <div style="font-size: 16px; font-weight: bold; color: #2e2e2e;">${data.winterServiceFee} Kč měsíčně</div>
                      <div style="font-size: 10px; color: #525252;">
                        Pohotovost ${data.winterPeriod ? `od ${data.winterPeriod.start.day}.${data.winterPeriod.start.month}. do ${data.winterPeriod.end.day}.${data.winterPeriod.end.month}.` : '(Nov 15 - Mar 14)'}
                      </div>
                    </div>
                    ${data.winterCalloutFee ? `
                      <div style="flex: 1; border-left: 1px solid #D4D4D4; padding-left: 12px;">
                        <div style="font-size: 16px; font-weight: bold; color: #2e2e2e;">${data.winterCalloutFee} Kč za výjezd</div>
                        <div style="font-size: 10px; color: #525252;">Cena je včetně posypového materiálu</div>
                      </div>
                    ` : ''}
                  </div>
                `}
              </div>
            </div>
          ` : ''}
        </div>
      ` : ''}

      
      ${renderConditionsSection(data.conditions)}
      <p class="mt-4 hh-muted hh-small">Cena obsahuje pravidelný týdenní, měsíční a generální úklid 2x ročně, dopravu pracovníků na místo úklidových prací, pojištění odpovědnosti do výše 5 mil. Kč, běžné úklidové prostředky a vlastní úklidové náčiní.</p>
      <p class="hh-muted hh-small">Ostatní práce nad rámec smlouvy (např. úklid po řemeslnících, výjezd na vyžádání apod.): 345 Kč / hod. za pracovníka.</p>
      <p class="hh-muted hh-small">Nejsme plátci DPH. Úklidové práce provádějí vždy naši stálí pracovníci.</p>

      
      <div style="page-break-inside: avoid;">
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

function renderCompleteQATable(tasks?: string[], summaryItems?: { label: string; value: string }[]): string {
  // Combine all data into one comprehensive list
  const allItems: { label: string; value: string }[] = [];
  
  // Add summary items first (high-level summaries)
  if (summaryItems) {
    allItems.push(...summaryItems);
  }
  
  // Add detailed tasks (convert from "question answer" format to proper Q&A pairs)
  if (tasks) {
    tasks.forEach(task => {
      // Split on the last space to separate question from answer
      const lastSpaceIndex = task.lastIndexOf(' ');
      if (lastSpaceIndex > 0) {
        const question = task.substring(0, lastSpaceIndex);
        const answer = task.substring(lastSpaceIndex + 1);
        allItems.push({ label: question, value: answer });
      } else {
        // If no space found, treat as answer only
        allItems.push({ label: "Údaj", value: task });
      }
    });
  }
  
  if (allItems.length === 0) return "";
  
  const rows = allItems
    .map((item, index) => {
      const isEven = index % 2 === 0;
      const bgColor = isEven ? "bg-light-gray" : "bg-white";
      
      return `
        <tr class="${bgColor}">
          <td class="px-3 py-1 text-sm border border-gray-pdf font-medium text-left">${escapeHtml(item.label)}</td>
          <td class="px-3 py-1 text-sm border border-gray-pdf text-left">${escapeHtml(item.value)}</td>
        </tr>
      `;
    })
    .join("");
  
  return `
    <div class="mt-4">
      <table class="w-full border-collapse border border-gray-pdf text-sm">
        <colgroup>
          <col style="width: 75%;">
          <col style="width: 25%;">
        </colgroup>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function renderNotesSection(notes?: string): string {
  if (!notes || notes.trim() === "" || notes.trim() === "-") return "";
  
  return `
    <div class="mt-6" style="page-break-inside: avoid;">
      <div class="font-semibold mb-2">Poznámka zákazníka:</div>
      <div class="bg-light-gray border border-gray-pdf rounded-lg p-4">
        <p class="text-sm leading-relaxed">${escapeHtml(notes.trim())}</p>
      </div>
    </div>
  `;
}

function renderConditionsSection(conditions?: string[]): string {
  if (!conditions || conditions.length === 0) return "";
  
  const conditionsList = conditions
    .map(condition => `<li class="text-sm" style="color: #2e2e2e;">${escapeHtml(condition)}</li>`)
    .join("");
  
  return `
    <div class="mt-4 p-2 rounded" style="background-color: #ffecd6; border: 1px solid rgba(246, 168, 90, 0.3);">
      <div class="font-semibold mb-1" style="color: #2e2e2e; display: flex; align-items: center; gap: 6px; font-size: 13px;">
        <span style="color: #f6a85a; font-size: 14px;">ℹ️</span>
        Podmínky uvedené ceny:
      </div>
      <ul class="list-outside list-disc ml-4 space-y-0.5" style="list-style-type: disc;">
        ${conditionsList}
      </ul>
    </div>
  `;
}

function renderCommonServicesSection(commonServices?: { 
  weekly?: string[]; 
  monthly?: string[]; 
  biAnnual?: string[];
  perCleaning?: string[];
  generalCleaning?: string[];
}): string {
  if (!commonServices) return "";
  
  // Define service categories with their labels
  const serviceCategories = [
    { key: 'perCleaning', label: 'Při každém úklidu' },
    { key: 'generalCleaning', label: 'Generální úklid' },
    { key: 'weekly', label: '1 x týdně' },
    { key: 'monthly', label: '1 x měsíčně' },
    { key: 'biAnnual', label: '2 x ročně (generální úklid, placený zvlášť)' }
  ];
  
  // Filter to only categories that have content
  const activeCategories = serviceCategories.filter(category => {
    const services = commonServices[category.key as keyof typeof commonServices] as string[] | undefined;
    return services && services.length > 0;
  });
  
  if (activeCategories.length === 0) return "";
  
  let html = `
    <div class="mt-6">
      <div class="font-semibold mb-3 text-lg">Seznam běžně prováděných úkonů</div>
  `;
  
  // Render each active category
  activeCategories.forEach(category => {
    const services = commonServices[category.key as keyof typeof commonServices] as string[];
    const servicesList = services
      .map(service => `<li class="text-sm">${escapeHtml(service)}</li>`)
      .join("");
    
    html += `
      <div class="mb-3">
        <div class="font-medium mb-2 font-semibold">${category.label}</div>
        <ul class="list-outside list-disc ml-6 space-y-1 marker:text-primary-pdf">
          ${servicesList}
        </ul>
      </div>
    `;
  });
  
  html += `</div>`;
  return html;
}
