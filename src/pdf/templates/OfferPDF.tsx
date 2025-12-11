import { calendarLinkService } from '@/services/calendar-link-service';

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
  cleaningFrequency?: string; // For mapping perCleaning to frequency category
  cleaningFrequencyLabel?: string; // Human-readable frequency label for dynamic text
  serviceType?: string; // Service type ID (e.g., "one-time-cleaning", "handyman-services")
};
/**
 * Helper function to format Czech text for minimum hours with correct grammar
 * 1 hodina → "je 1 hodina"
 * 2, 3, 4 hodiny → "jsou 2/3/4 hodiny"
 * 5+ hodin → "je 5/6/20 hodin"
 */
function formatMinimumHoursText(hours: number): string {
  const hoursNum = Math.floor(hours);
  if (hoursNum === 1) {
    return `je ${hoursNum} hodina`;
  } else if (hoursNum >= 2 && hoursNum <= 4) {
    return `jsou ${hoursNum} hodiny`;
  } else {
    return `je ${hoursNum} hodin`;
  }
}

/**
 * Helper function to generate calendar links for one-time/window cleaning services
 */
function generateCalendarLinks(data: OfferData): { google: string; outlook: string } | null {
  // Only for one-time cleaning and window cleaning when submitted from poptavka
  if (!data.isPoptavka || !data.startDate) {
    return null;
  }
  
  const isOneTimeOrWindow = data.serviceType === "one-time-cleaning" || data.serviceType === "handyman-services";
  if (!isOneTimeOrWindow) {
    return null;
  }

  try {
    // Parse Czech date format (DD. MM. YYYY) or ISO format (YYYY-MM-DD)
    let startDate: Date;
    if (data.startDate.includes('.')) {
      // Czech format: "DD. MM. YYYY"
      const parts = data.startDate.split('.').map(p => p.trim());
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-based
        const year = parseInt(parts[2], 10);
        startDate = new Date(year, month, day, 9, 0, 0); // Default to 9:00 AM
      } else {
        return null;
      }
    } else if (data.startDate.includes('-')) {
      // ISO format: "YYYY-MM-DD"
      const [year, month, day] = data.startDate.split('-').map(Number);
      startDate = new Date(year, month - 1, day, 9, 0, 0); // Default to 9:00 AM
    } else {
      return null;
    }

    // Calculate end date: start date + minimum hours (default to 4 hours if not specified)
    const minimumHours = data.minimumHours || 4;
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + minimumHours);

    // Get location from customer address or use empty string
    const location = data.customer?.address || '';

    // Get service title
    const title = data.serviceTitle || 'Úklidové práce';

    // Generate calendar links
    const links = calendarLinkService.generateCalendarLinks({
      title,
      startDate,
      endDate,
      location,
      description: '',
    });

    return links;
  } catch (error) {
    console.error('Failed to generate calendar links:', error);
    return null;
  }
}

/**
 * Returns the HTML body markup for the Offer PDF using Tailwind classes.
 * We avoid JSX/react-dom usage so this can be safely called from a Route Handler.
 */
export function renderOfferPdfBody(data: OfferData, baseUrl?: string): string {
  const sectionThree = `
      <section class="mt-8" style="page-break-inside: avoid;">
        <div class="font-bold">3. Shrnutí - rozsah a specifikace pracovních úkonů</div>
        <div class="hh-divider mt-2"></div>
        ${(data.tasks?.length ?? 0) || (data.summaryItems?.length ?? 0) ? renderCompleteQATable(data.tasks, data.summaryItems) : ''}
        ${renderNotesSection(data.notes)}
        ${renderCommonServicesSection(data.commonServices, data.cleaningFrequency)}
      </section>

      <section class="hh-section mt-8">
        <div style="page-break-inside: avoid;">
          <div class="font-bold">4. Proč si vybrat právě nás?</div>
          <div class="hh-divider mt-2"></div>
          
          <div class="hh-features-box mt-6">
            <div class="hh-features-grid">
              <div class="hh-feature-item">
                <div class="hh-feature-icon">
                  <img src="money-time.svg" alt="money-time" class="hh-svg-icon" />
                </div>
                <div class="hh-feature-value">5 mil. Kč</div>
                <div class="hh-feature-label">Pojištění odpovědnosti za způsobené škody</div>
              </div>
              <div class="hh-feature-item">
                <div class="hh-feature-icon">
                  <img src="calendar.svg" alt="calendar" class="hh-svg-icon" />
                </div>
                <div class="hh-feature-value">20 let</div>
                <div class="hh-feature-label">Zkušeností s úklidovými službami</div>
              </div>
            </div>
          </div>
        <div>

        <div class="hh-benefits mt-6">
          <div class="hh-benefit-item" style="page-break-inside: avoid;">
            <div class="hh-benefit-title text-xs">Zkušenosti s úklidovými službami již 20 let</div>
            <div class="hh-benefit-text">Naše dlouholeté působení na trhu je zárukou profesionálního přístupu, osvědčených postupů a stabilního týmu. Víme, jak zajistit maximální kvalitu a spokojenost našich klientů.</div>
          </div>
          <div class="hh-benefit-item" style="page-break-inside: avoid;">
            <div class="hh-benefit-title text-xs">Prověření a kvalifikovaní pracovníci</div>
            <div class="hh-benefit-text">Naši pracovníci jsou pečlivě prověřeni, jsou spolehliví, dochvilní a prošli důkladným školením. Můžete se na ně plně spolehnout, že odvedou svoji práci na 100 %.</div>
          </div>
          <div class="hh-benefit-item" style="page-break-inside: avoid;">
            <div class="hh-benefit-title text-xs">Garance kvality a spolehlivosti</div>
            <div class="hh-benefit-text">Dbáme na nejvyšší standardy úklidu, používáme kvalitní čisticí prostředky a moderní vybavení. Váš prostor bude vždy čistý, upravený a voňavý. Také vaše zpětná vazba je pro nás velmi důležitá.</div>
          </div>
          <div class="hh-benefit-item" style="page-break-inside: avoid;">
            <div class="hh-benefit-title text-xs">Flexibilita a individuální přístup</div>
            <div class="hh-benefit-text">Chápeme, že každý klient má jiné požadavky. Nabízíme pravidelné či nepravidelné úklidy, přizpůsobíme se vám podle rozvrhu a potřeb. Můžete si vybrat termíny i rozsah služeb, jak vám to nejvíce vyhovuje.</div>
          </div>
          <div class="hh-benefit-item" style="page-break-inside: avoid;">
            <div class="hh-benefit-title text-xs">Pojištění do výše 5 mil. Kč a jistota</div>
            <div class="hh-benefit-text">Veškeré naše práce jsou kryty pojištěním, což zajišťuje ochranu Vašeho majetku a absolutní klid na duši. Při jakékoliv nečekané události za nás ručíme.</div>
          </div>
          <div class="hh-benefit-item" style="page-break-inside: avoid;">
            <div class="hh-benefit-title text-xs">Zákaznická spokojenost na prvním místě</div>
            <div class="hh-benefit-text">Naším cílem je vybudovat dlouhodobé vztahy založené na důvěře, profesionalitě a individuálním přístupu. Vaše spokojenost je pro nás vždy na prvním místě.</div>
          </div>
        </div>
      </section>
    `;

  return `
    <section>
      <div class="text-3xl font-bold text-foreground">Cenová nabídka úklidových služeb</div>
      <p class="text-muted-foreground">poskytnutá na základě vyplnění poptávkového formuláře ze dne ${escapeHtml(data.quoteDate)}</p>
    </section>

    <section class="mt-6">
      <div class="font-bold">1. Identifikace a kontaktní údaje</div>
      <div class="hh-divider mt-2"></div>
      <div class="grid grid-cols-2 gap-6 mt-4">
        <div class="text-xs">
          <div class="font-semibold">Údaje o vás:</div>
          <div>${escapeHtml(data.customer.name)}</div>
          ${data.customer.address ? `<div>${escapeHtml(data.customer.address)}</div>` : ""}
          ${data.customer.email ? `<div>${escapeHtml(data.customer.email)}</div>` : ""}
          ${data.customer.phone ? `<div>${escapeHtml(data.customer.phone)}</div>` : ""}
          ${(data.customer as Record<string, unknown>).company ? (() => {
            const company = (data.customer as Record<string, unknown>).company as Record<string, unknown>;
            const companyName = company.name as string || '';
            const companyIco = company.ico as string || '';
            const companyDic = company.dic as string || '';
            const companyAddress = company.address as string || '';
            
            // Build company info with name on its own line
            const companyIdParts: string[] = [];
            if (companyIco) companyIdParts.push(`IČO: ${escapeHtml(companyIco)}`);
            if (companyDic) companyIdParts.push(`DIČ: ${escapeHtml(companyDic)}`);
            
            return `
            <div class="mt-2">
              ${companyName ? `<div>${escapeHtml(companyName)}</div>` : ''}
              ${companyIdParts.length > 0 ? `<div>${companyIdParts.join(', ')}</div>` : ''}
              ${companyAddress ? `<div>${escapeHtml(companyAddress)}</div>` : ''}
            </div>
          `;
          })() : ""}
        </div>
        <div class="text-xs">
          <div class="font-semibold">Údaje o nás:</div>
          <div>Handy Hands CZ, s.r.o.</div>
          <div>Mužíkova 1759/2, Nusle, 140 00 Praha 4</div>
          <div>IČO: 23952580</div>
        </div>
      </div>
      ${data.poptavkaNotes ? `
        <div class="mt-2">
          <div class="text-xs"><span class="font-semibold">Poznámka k poptávce:</span> ${escapeHtml(data.poptavkaNotes)}</div>
        </div>
      ` : ""}
    </section>

    <section class="mt-6">
      <div class="font-bold">2. ${data.isHourlyService ? 'Cena jednorázového úklidu - mytí oken nebo ostatních služeb' : 'Celková cena pravidelného úklidu'}</div>
      <div class="hh-divider mt-1"></div>
      
      ${data.isHourlyService ? `
        <!-- New layout for hourly services -->
        <p class="mt-4 text-xs text-black-pdf">${(() => {
          // Format service title based on service type
          const serviceType = data.serviceType || (data.customer as Record<string, unknown>)?.serviceType as string | undefined;
          if (serviceType === "handyman-services") {
            return `Cena za vámi požadovaný <strong>jednorázový úklid (mytí oken nebo ostatních služeb)</strong> je ve výši:`;
          } else if (serviceType === "one-time-cleaning") {
            return `Cena za vámi požadovaný <strong>jednorázový úklid jakékoliv nemovitosti</strong> je ve výši:`;
          } else {
            return `Cena za vámi požadovaný <strong>${escapeHtml((data.serviceTitle || 'službu').toLowerCase())}</strong> je ve výši:`;
          }
        })()}</p>
        
        <!-- Orange-bordered box -->
        <div class="mt-4 hh-pricing-box">
          <!-- Top section: Price and Date side by side -->
          <div class="hh-pricing-top">
            <!-- Left: Pricing -->
            <div>
              <!-- Icon -->
              <div class="text-center mb-2">
                <img src="money-time.svg" alt="money-time" class="hh-svg-icon" />
              </div>
              <!-- Main Price -->
              <div class="text-center mb-2">
                <span class="text-2xl font-bold text-primary-pdf">${Number(data.hourlyRate || data.price).toLocaleString("cs-CZ")} Kč</span>
                <span class="text-base font-normal text-black"> / hod. / pracovník</span>
              </div>
              <!-- Description -->
              <div class="text-left text-xs text-black-pdf">
                Hodinová sazba jednorázového úklidu - mytí oken apod. (minimální délka trvání prací ${formatMinimumHoursText(data.minimumHours || 2)})
              </div>
            </div>
            
            <!-- Right: Availability -->
            <div>
              <!-- Icon -->
              <div class="text-center mb-2">
                <img src="calendar.svg" alt="calendar" class="hh-svg-icon" />
              </div>
              <!-- Main Date -->
              <div class="text-center mb-2">
                <div class="text-2xl font-bold text-primary-pdf leading-tight">
                  ${escapeHtml(data.startDate)}
                </div>
              </div>
              <!-- Description -->
              <div class="text-center text-xs text-black-pdf">
                S úklidovými službami jsme schopni začít od tohoto dne
              </div>
            </div>
          </div>
          
          <!-- Solid horizontal separator with plus circles -->
          <div class="hh-pricing-separator">
            ${(() => {
              const cleaningSupplies = data.fixedAddons?.find(a => {
                const labelLower = a.label.toLowerCase();
                return labelLower.includes('úklidové náčiní') || labelLower.includes('úklidová chemie');
              });
              const transport = data.fixedAddons?.find(a => {
                const labelLower = a.label.toLowerCase();
                return labelLower.includes('doprava') || a.label === 'Doprava' || a.label === 'doprava';
              });
              const hasBoth = cleaningSupplies && transport;
              return hasBoth ? `
                <span class="hh-addon-plus hh-addon-plus-left">+</span>
                <span class="hh-addon-plus hh-addon-plus-right">+</span>
              ` : cleaningSupplies ? `
                <span class="hh-addon-plus" style="left: 50%;">+</span>
              ` : transport ? `
                <span class="hh-addon-plus" style="left: 50%;">+</span>
              ` : '';
            })()}
          </div>
          
          <!-- Bottom section: Add-ons in two columns (or one full width if only one) -->
          ${(() => {
            const cleaningSupplies = data.fixedAddons?.find(a => {
              const labelLower = a.label.toLowerCase();
              return labelLower.includes('úklidové náčiní') || labelLower.includes('úklidová chemie');
            });
            const transport = data.fixedAddons?.find(a => {
              const labelLower = a.label.toLowerCase();
              return labelLower.includes('doprava') || a.label === 'Doprava' || a.label === 'doprava';
            });
            const hasBoth = cleaningSupplies && transport;
            
            return `
            <div class="hh-addon-grid ${hasBoth ? 'hh-addon-grid-double' : 'hh-addon-grid-single'}">
              ${cleaningSupplies ? `
                <div class="${hasBoth ? 'hh-addon-item-left' : ''}">
                  <div class="text-center">
                    <div class="text-xs text-black-pdf">
                      <div class="font-bold">úklidové náčiní a úklidová chemie</div>
                      <div class="font-bold mt-1">${cleaningSupplies.amount} Kč</div>
                    </div>
                  </div>
                </div>
              ` : ''}
              
              ${transport ? `
                <div class="${hasBoth ? 'hh-addon-item-right' : ''}">
                  <div class="text-center">
                    <div class="text-xs text-black-pdf">
                      <div class="font-bold">doprava tam a zpět</div>
                      <div class="font-bold mt-1">${transport.amount} Kč</div>
                    </div>
                  </div>
                </div>
              ` : ''}
            </div>
            `;
          })()}
        </div>
      ` : `
        <!-- Retail/regular services pricing box - merged with general cleaning and winter service -->
        <p class="mt-4 text-xs text-black-pdf">Cena za vámi požadovaný <strong>${escapeHtml((data.serviceTitle || 'službu').toLowerCase())}</strong> je ve výši:</p>
        <div class="mt-4 hh-pricing-box">
          <div class="hh-pricing-top">
            <!-- Left: Monthly price -->
            <div>
              <div class="text-center mb-2">
                <img src="money-time.svg" alt="money-time" class="hh-svg-icon" />
              </div>
              <div class="text-center mb-2">
                <span class="text-2xl font-bold text-primary-pdf">${Number(data.price).toLocaleString("cs-CZ")} Kč</span>
                <span class="text-base font-normal text-black"> za měsíc</span>
              </div>
              <div class="text-center text-xs text-black-pdf">
                Celková částka pravidelného úklidu prostor<br/>
                (včetně níže popsaných náležitostí)
              </div>
            </div>
            <!-- Right: Start date -->
            <div>
              <div class="text-center mb-2">
                <img src="calendar.svg" alt="calendar" class="hh-svg-icon" />
              </div>
              <div class="text-center mb-2">
                <div class="text-2xl font-bold text-primary-pdf leading-tight">${escapeHtml(data.startDate)}</div>
              </div>
              <div class="text-center text-xs text-black-pdf">
                S úklidovými službami jsme schopni začít od tohoto dne
              </div>
            </div>
          </div>

          <!-- Additional services - merged into same box -->
          ${data.generalCleaningPrice || data.winterServiceFee ? `
            <!-- Solid horizontal separator with plus circles -->
            <div class="hh-pricing-separator">
              ${(() => {
                const hasBoth = data.generalCleaningPrice && data.winterServiceFee;
                return hasBoth ? `
                  <span class="hh-addon-plus hh-addon-plus-left">+</span>
                  <span class="hh-addon-plus hh-addon-plus-right">+</span>
                ` : (data.generalCleaningPrice || data.winterServiceFee) ? `
                  <span class="hh-addon-plus" style="left: 50%;">+</span>
                ` : '';
              })()}
            </div>
            
            <!-- Bottom section: Services in two columns (or one full width if only one) -->
            ${(() => {
              const hasBoth = data.generalCleaningPrice && data.winterServiceFee;
              
              return `
              <div class="hh-addon-grid ${hasBoth ? 'hh-addon-grid-double' : 'hh-addon-grid-single'}">
                ${data.generalCleaningPrice ? `
                  <div class="${hasBoth ? 'hh-addon-item-left' : ''}">
                    <div class="text-center">
                      <div class="text-xs text-black-pdf">
                        <div class="font-bold">Generální úklid domu</div>
                        <div class="font-bold mt-1">${Math.round(data.generalCleaningPrice / 10) * 10} Kč,
                          ${data.generalCleaningFrequency ? `${data.generalCleaningFrequency} za každý provedený úklid` : '2x ročně'}
                        </div>
                      </div>
                    </div>
                  </div>
                ` : ''}
                
                ${data.winterServiceFee ? `
                  <div class="${hasBoth ? 'hh-addon-item-right' : ''}">
                    <div class="text-center">
                      <div class="text-xs text-black-pdf">
                        <div class="font-bold">Zimní údržba</div>
                        <div class="font-bold mt-1">
                          ${data.winterServiceFee} Kč měsíčně${data.winterCalloutFee ? ` za pohotovost + ${data.winterCalloutFee} Kč za výjezd*` : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                ` : ''}
              </div>
              `;
            })()}
          ` : ''}
        </div>

        ${data.winterServiceFee ? `
          <p class="mt-2 text-2xs text-black-pdf">* pohotovost se drží v období od ${data.winterPeriod ? `${data.winterPeriod.start.day}. ${data.winterPeriod.start.month}.` : '15. 11.'} do ${data.winterPeriod ? `${data.winterPeriod.end.day}. ${data.winterPeriod.end.month}.` : '14. 3.'} a cena případného výjezdu je včetně posypového materiálu</p>
        ` : ''}

        ${data.poptavkaHash ? `
          <div class="mt-4" style="text-align: right;">
            <a href="${baseUrl}/poptavka?hash=${escapeHtml(data.poptavkaHash)}" 
               class="inline-block px-5 py-2.5 bg-primary-pdf border-2 border-primary-pdf rounded-md font-bold text-black text-sm">
              Zaslat návrh smlouvy
            </a>
          </div>
        ` : ''}
      `}

      
      ${renderConditionsSection(data.conditions)}
      
      ${data.isHourlyService ? `
        <!-- Footer text for hourly services -->
        <div class="mt-6 flex items-start gap-6">
          <div class="flex-1">
            <p class="hh-muted hh-small mb-8 text-black-pdf">Cena obsahuje pojištění odpovědnosti do výše 5 mil. Kč.</p>
            <p class="hh-muted text-xs text-black-pdf"><strong>Nejsme plátci DPH, uvedené ceny jsou konečné</strong>.</p>
            <p class="hh-muted text-xs text-black-pdf">Úklidové práce provádějí vždy naši <strong>stálí</strong> pracovníci.</p>
            <p class="hh-muted text-xs text-black-pdf">V případě dotazů nebo nejasností se na nás neváhejte obrátit.</p>
          </div>
          ${(() => {
            const calendarLinks = generateCalendarLinks(data);
            if (calendarLinks) {
              // For one-time/window cleaning from poptavka: show calendar links
              return `
                <div class="self-start">
                  <div class="text-sm font-semibold text-black-pdf mb-2">Přidat do kalendáře:</div>
                  <div class="flex gap-2">
                    <a href="${escapeHtml(calendarLinks.google)}" 
                       target="_blank"
                       class="inline-block px-4 py-2 bg-primary-pdf border-2 border-primary-pdf rounded-md font-bold text-black text-xs">
                      Google
                    </a>
                    <a href="${escapeHtml(calendarLinks.outlook)}" 
                       target="_blank"
                       class="inline-block px-4 py-2 bg-primary-pdf border-2 border-primary-pdf rounded-md font-bold text-black text-xs">
                      Outlook
                    </a>
                  </div>
                </div>
              `;
            } else if (data.poptavkaHash) {
              // For regular services or non-poptavka: show original button
              return `
                <div class="self-start">
                  <a href="${baseUrl}/poptavka?hash=${escapeHtml(data.poptavkaHash)}" 
                     class="inline-block px-5 py-2.5 bg-primary-pdf border-2 border-primary-pdf rounded-md font-bold text-black text-sm">
                    Závazná poptávka
                  </a>
                </div>
              `;
            }
            return '';
          })()}
        </div>
        
        <!-- Signatures for hourly services -->
        ${renderSignaturesSection(data.quoteDate)}
      ` : `
        <!-- Footer text for regular services - dynamic based on cleaning frequency -->
        ${(() => {
          // Check if this is office cleaning
          const isOfficeCleaning = data.serviceTitle?.toLowerCase().includes('kancelář') || false;
          
          // Check if this is retail/commercial spaces
          const isRetail = data.serviceTitle?.toLowerCase().includes('komerčních') || 
                          data.serviceTitle?.toLowerCase().includes('retailových') || false;
          
          if (isOfficeCleaning) {
            // Special text for office cleaning
            return `<p class="mt-6 hh-small text-black-pdf">Cena obsahuje pravidelný úklid kancelářských prostor podle rozpisu níže, dopravu pracovníků na místo úklidových prací, pojištění odpovědnosti do výše 5 mil. Kč.</p>
            <p class="hh-small text-black-pdf">Ostatní práce nad rámec smlouvy (např. mimořádný úklid na vyžádání, po havárii apod.): 345 Kč / hod. za pracovníka.</p>
            <p class="hh-muted text-xs text-black-pdf mt-4"><strong>Nejsme plátci DPH, uvedené ceny jsou konečné</strong>.</p>
            <p class="hh-muted text-xs text-black-pdf">Úklidové práce provádějí vždy naši <strong>stálí</strong> pracovníci.</p>
            <p class="hh-muted text-xs text-black-pdf">V případě dotazů nebo nejasností se na nás neváhejte obrátit.</p>`;
          }
          
          if (isRetail) {
            // Special text for retail/commercial spaces
            return `<p class="mt-6 hh-small text-black-pdf">Cena obsahuje pravidelný úklid komerčních nebytových (retailových) prostor podle rozpisu níže, dopravu pracovníků na místo úklidových prací, pojištění odpovědnosti do výše 5 mil. Kč.</p>
            <p class="hh-small text-black-pdf">Ostatní práce nad rámec smlouvy (např. mimořádný úklid na vyžádání, po havárii apod.): 345 Kč / hod. za pracovníka.</p>
            <p class="hh-muted text-xs text-black-pdf mt-4"><strong>Nejsme plátci DPH, uvedené ceny jsou konečné</strong>.</p>
            <p class="hh-muted text-xs text-black-pdf">Úklidové práce provádějí vždy naši <strong>stálí</strong> pracovníci.</p>
            <p class="hh-muted text-xs text-black-pdf">V případě dotazů nebo nejasností se na nás neváhejte obrátit.</p>`;
          }
          
          // Build dynamic frequency text - handle different form types
          let frequencyPart = '';
          
          // For residential buildings and similar forms with cleaning frequency
          if (data.cleaningFrequencyLabel) {
            // Map frequency labels to text parts
            const isWeekly = ['1x týdně', '2x týdně', '1x za 14 dní', 'Každý pracovní den', '3x týdně'].includes(data.cleaningFrequencyLabel);
            const isMonthly = ['1x měsíčně', '1x za měsíc'].includes(data.cleaningFrequencyLabel);
            
            if (isWeekly) {
              frequencyPart = 'pravidelný týdenní, měsíční a generální úklid';
            } else if (isMonthly) {
              frequencyPart = 'pravidelný měsíční a generální úklid';
            } else {
              frequencyPart = 'pravidelný úklid a generální úklid';
            }
          } else {
            // Default for forms without frequency selection (like retail)
            frequencyPart = 'pravidelný úklid komerčních nebytových (retailových) prostor';
          }
          
          // Get general cleaning frequency (e.g., "2x ročně", "4x ročně")
          const generalCleaningFreq = data.generalCleaningFrequency || '2x ročně';
          
          // Determine if we should include cleaning supplies text
          const includeSupplies = !data.generalCleaningPrice && !data.winterServiceFee;
          const suppliesText = includeSupplies ? ', běžné úklidové prostředky a vlastní úklidové náčiní' : '';
          
          return `<p class="mt-6 hh-small text-black-pdf">Cena obsahuje ${frequencyPart} ${generalCleaningFreq} podle rozpisu níže, dopravu pracovníků na místo úklidových prací, pojištění odpovědnosti do výše 5 mil. Kč${suppliesText}, běžné úklidové prostředky a vlastní úklidové náčiní. Ostatní práce nad rámec smlouvy (např. úklid po řemeslnících, po havárii apod.): 345 Kč / hod. za pracovníka.</p>
            <p class="hh-muted text-xs text-black-pdf mt-4"><strong>Nejsme plátci DPH, uvedené ceny jsou konečné</strong>.</p>
            <p class="hh-muted text-xs text-black-pdf">Úklidové práce provádějí vždy naši <strong>stálí</strong> pracovníci.</p>
            <p class="hh-muted text-xs text-black-pdf">V případě dotazů nebo nejasností se na nás neváhejte obrátit.</p>`;
        })()}
      `}

      ${!data.isHourlyService ? `
        ${renderSignaturesSection(data.quoteDate)}
      ` : ""}
    </section>
    ${sectionThree}

    <section class="hh-last-page">
      <div class="hh-last-note">
        <div class="text-center font-bold text-sm text-black-pdf mt-4">Tato cenová nabídka je platná po dobu 30 dnů od data jejího vytvoření.</div>
      </div>
    </section>
  `;
}

function renderSignaturesSection(quoteDate: string): string {
  return `
    <div class="mt-4" style="page-break-inside: avoid;">
      <p class="text-xs text-black-pdf">V Praze, dne ${escapeHtml(quoteDate)}</p>
      <div class="grid grid-cols-2 gap-12 hh-signature-block">
        <div class="hh-signature-content">
          <img src="signature-lenka.svg" alt="Podpis Lenka Krátká" class="hh-signature-image" />
          <div class="hh-sign-name">Lenka Krátká</div>
          <div class="hh-small hh-muted">Regionální manažer pravidelných úklidů</div>
        </div>
        <div class="hh-signature-content">
          <img src="signature-jana.svg" alt="Podpis Petr Jančálek" class="hh-signature-image" />
          <div class="hh-sign-name">Petr Jančálek</div>
          <div class="hh-small hh-muted">Jednatel Handy Hands CZ, s.r.o.</div>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(input: string | undefined | null): string {
  if (!input) return '';
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
      const isLastRow = index === allItems.length - 1;
      
      return `
        <tr class="${bgColor}">
          <td class="px-2 py-1 text-xs font-medium text-left" style="border-right: 1px solid var(--border-gray); border-bottom: ${isLastRow ? 'none' : '1px solid var(--border-gray)'};">${escapeHtml(item.label)}</td>
          <td class="px-2 py-1 text-xs text-left" style="border-bottom: ${isLastRow ? 'none' : '1px solid var(--border-gray)'};">${escapeHtml(item.value)}</td>
        </tr>
      `;
    })
    .join("");
  
  return `
    <div class="mt-4" style="border: 1px solid var(--border-gray); border-radius: 8px; overflow: hidden;">
      <table class="w-full text-xs" style="border-collapse: collapse;">
        <colgroup>
          <col style="width: 65%;">
          <col style="width: 35%;">
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
      <div class="font-semibold mb-2 text-xs">Poznámka zákazníka:</div>
      <div class="bg-light-gray border border-gray-pdf rounded-lg p-2">
        <p class="text-xs">${escapeHtml(notes.trim())}</p>
      </div>
    </div>
  `;
}

function renderConditionsSection(conditions?: string[]): string {
  if (!conditions || conditions.length === 0) return "";
  
  const conditionsList = conditions
    .map(condition => `<li class="text-xs text-black-pdf">${escapeHtml(condition)}</li>`)
    .join("");
  
  return `
    <div class="mt-1">
      <div class="font-semibold mb-2 text-xs text-black-pdf">Podmínky uvedené ceny:</div>
      <ul class="list-outside list-disc ml-6 space-y-1 marker:text-primary-pdf">
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
}, cleaningFrequency?: string): string {
  if (!commonServices) return "";
  
  // Map cleaning frequency to commonServices key
  // Weekly frequencies map to weekly, monthly to monthly
  const frequencyMap: Record<string, 'weekly' | 'monthly'> = {
    'weekly': 'weekly',
    'twice-weekly': 'weekly',
    'biweekly': 'weekly',
    'daily': 'weekly',
    'workdays': 'weekly', // Commercial spaces: every workday
    'everyday': 'weekly', // Commercial spaces: every day including weekends
    '3x-weekly': 'weekly',
    '2x-weekly': 'weekly',
    'daily-basic-weekly': 'weekly',
    'daily-basic-weekly-wc': 'weekly',
    'daily-weekends-basic-weekly': 'weekly',
    'daily-weekends-basic-weekly-wc': 'weekly',
    'monthly': 'monthly'
  };
  
  // Merge perCleaning into the appropriate frequency category
  const mergedServices: typeof commonServices = { ...commonServices };
  
  if (cleaningFrequency && commonServices.perCleaning && commonServices.perCleaning.length > 0) {
    const targetKey = frequencyMap[cleaningFrequency];
    if (targetKey) {
      // Merge perCleaning services into the frequency category
      mergedServices[targetKey] = [
        ...(mergedServices[targetKey] || []),
        ...commonServices.perCleaning
      ];
      // Remove perCleaning since it's now merged
      delete mergedServices.perCleaning;
    }
  }
  
  // Define service categories with their labels
  const serviceCategories = [
    { key: 'weekly', label: 'Při každém úklidu' },
    { key: 'monthly', label: '1 x měsíčně' },
    { key: 'perCleaning', label: 'Při každém úklidu' }, // Fallback if perCleaning wasn't merged
    { key: 'generalCleaning', label: 'V rámci pravidelného generálního úklidu (pokud je zadán v poptávkovém formuláři)' }
  ];
  
  // Filter to only categories that have content
  const activeCategories = serviceCategories.filter(category => {
    const services = mergedServices[category.key as keyof typeof mergedServices] as string[] | undefined;
    return services && services.length > 0;
  });
  
  if (activeCategories.length === 0) return "";
  
  let html = `
    <div class="mt-6">
      <div class="font-semibold mb-3 text-sm">Seznam běžně prováděných úkonů</div>
  `;
  
  // Render each active category
  activeCategories.forEach(category => {
    const services = mergedServices[category.key as keyof typeof mergedServices] as string[];
    // Separate standard services from optional services
    const standardServices: string[] = [];
    const optionalServices: string[] = [];
    
    services.forEach(service => {
      if (service.startsWith('příplatkové služby:')) {
        // Remove the prefix, it will be added as a header
        const serviceName = service.replace(/^příplatkové služby:\s*/, '');
        optionalServices.push(serviceName);
      } else {
        standardServices.push(service);
      }
    });
    
    html += `
      <div class="mb-3">
        <div class="font-medium mb-2 font-semibold text-xs">${category.label}</div>
        <ul class="list-outside list-disc ml-6 space-y-1 marker:text-primary-pdf">
          ${standardServices.map(service => `<li class="text-xs">${escapeHtml(service)}</li>`).join("")}
          ${optionalServices.length > 0 ? `
            <li class="text-xs">
              <span class="font-bold">příplatkové služby:</span>
              <ul class="list-outside list-disc ml-4 mt-1 space-y-1 marker:text-primary-pdf">
                ${optionalServices.map(service => `<li class="text-xs">${escapeHtml(service)}</li>`).join("")}
              </ul>
            </li>
          ` : ''}
        </ul>
      </div>
    `;
  });
  
  html += `</div>`;
  return html;
}
