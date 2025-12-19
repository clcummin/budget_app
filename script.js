const STORAGE_KEY = "budget-planner-state-v4";
const SOCIAL_SECURITY_WAGE_BASE = 174600; // 2025 wage base
const MEDICARE_SURTAX_DEFAULT_THRESHOLD = 200000;
const MENTAL_HEALTH_SURCHARGE_RATE = 0.01;
const MENTAL_HEALTH_SURCHARGE_THRESHOLD = 1000000;

const CA_BRACKETS_2025 = {
  single: [
    { upTo: 11079, rate: 0.01 },
    { upTo: 26275, rate: 0.02 },
    { upTo: 41471, rate: 0.04 },
    { upTo: 57645, rate: 0.06 },
    { upTo: 72841, rate: 0.08 },
    { upTo: 371994, rate: 0.093 },
    { upTo: 446392, rate: 0.103 },
    { upTo: 742953, rate: 0.113 },
    { upTo: Infinity, rate: 0.123 }
  ],
  married: [
    { upTo: 22158, rate: 0.01 },
    { upTo: 52550, rate: 0.02 },
    { upTo: 82942, rate: 0.04 },
    { upTo: 115290, rate: 0.06 },
    { upTo: 145682, rate: 0.08 },
    { upTo: 743988, rate: 0.093 },
    { upTo: 892784, rate: 0.103 },
    { upTo: 1485906, rate: 0.113 },
    { upTo: Infinity, rate: 0.123 }
  ],
  hoh: [
    { upTo: 22173, rate: 0.01 },
    { upTo: 52576, rate: 0.02 },
    { upTo: 67994, rate: 0.04 },
    { upTo: 83639, rate: 0.06 },
    { upTo: 98382, rate: 0.08 },
    { upTo: 504013, rate: 0.093 },
    { upTo: 604816, rate: 0.103 },
    { upTo: 1010417, rate: 0.113 },
    { upTo: Infinity, rate: 0.123 }
  ]
};

const CA_FILING_LABELS = {
  single: "Single / MFS",
  married: "Married / QSS",
  hoh: "Head of household"
};

const FEDERAL_BRACKETS_2025_SINGLE = [
  { upTo: 11975, rate: 0.1 },
  { upTo: 48650, rate: 0.12 },
  { upTo: 103750, rate: 0.22 },
  { upTo: 198100, rate: 0.24 },
  { upTo: 251500, rate: 0.32 },
  { upTo: 628850, rate: 0.35 },
  { upTo: Infinity, rate: 0.37 }
];

const defaultBudgetTree = [
  {
    id: "section-housing",
    type: "section",
    title: "Housing",
    note: "Mortgage/rent, HOA, utilities, taxes",
    collapsed: false,
    targetPercent: 40,
    children: [
      { id: "item-primary", type: "item", title: "Home - primary", percent: 28.1, note: "Mortgage/rent, HOA, water, taxes" },
      {
        id: "section-california",
        type: "section",
        title: "California housing",
        note: "Rent + utilities",
        collapsed: false,
        targetPercent: 12,
        children: [
          { id: "item-rent", type: "item", title: "Rent", percent: 18, note: "Apartment rent" },
          { id: "item-utilities", type: "item", title: "Utilities", percent: 11.4, note: "Power, water, trash, internet" }
        ]
      }
    ]
  },
  {
    id: "section-transportation",
    type: "section",
    title: "Transportation",
    note: "Gas, car payment, insurance, parking",
    collapsed: false,
    targetPercent: 15,
    children: [
      { id: "item-transport", type: "item", title: "Transportation", percent: 13.5, note: "Gas, car payment, insurance, parking" }
    ]
  },
  {
    id: "section-debt",
    type: "section",
    title: "Debt",
    note: "Cards and student loans",
    collapsed: false,
    targetPercent: 10,
    children: [
      { id: "item-debt", type: "item", title: "Debt", percent: 3.6, note: "Cards and student loans" }
    ]
  },
  {
    id: "section-expenses",
    type: "section",
    title: "Additional expenses",
    note: "Subscriptions, memberships, misc",
    collapsed: false,
    targetPercent: 10,
    children: [
      { id: "item-additional", type: "item", title: "Additional expenses", percent: 7, note: "Subscriptions, memberships, misc" }
    ]
  },
  {
    id: "section-charity",
    type: "section",
    title: "Charitable donations",
    note: "Monthly giving",
    collapsed: false,
    targetPercent: 5,
    children: [
      { id: "item-charity", type: "item", title: "Charitable donations", percent: 1, note: "Monthly giving" }
    ]
  },
  {
    id: "section-savings",
    type: "section",
    title: "Savings",
    note: "Reserve, vacations, long-term",
    collapsed: false,
    targetPercent: 20,
    children: [
      { id: "item-savings", type: "item", title: "Savings", percent: 17.4, note: "Reserve, vacations, long-term" }
    ]
  }
];

const defaultState = {
  salaryAnnual: 0,
  salaryPerPay: 0,
  periodsPerYear: 26,
  standardDeductionAnnual: 15070,
  w4ExtraAnnual: 0,
  w4ExtraPerPay: 0,
  k401Percent: 0,
  hsaAnnual: 0,
  hsaPerPay: 0,
  dentalAnnual: 0,
  dentalPerPay: 0,
  medicalAnnual: 0,
  medicalPerPay: 0,
  otherPretaxAnnual: 0,
  otherPretaxPerPay: 0,
  federalBracketOverride: null,
  federalRate: 0,
  stateBracketOverride: null,
  stateFilingStatus: "single",
  stateRate: 0,
  socialSecurityRate: 6.2,
  medicareRate: 1.45,
  medicareSurtaxRate: 0.9,
  medicareSurtaxThreshold: MEDICARE_SURTAX_DEFAULT_THRESHOLD,
  sdiRate: 1,
  afterTaxDeductions: [],
  additionalIncomeItems: [],
  budgetTree: structuredClone(defaultBudgetTree),
  collapsedCards: {
    income: false,
    pretax: false,
    taxes: false,
    posttax: false,
    additional: false,
    summary: true,
    budget: false,
    "bucket-overview": false
  }
};

const currency = (value) => {
  if (!Number.isFinite(value)) return "$0";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  });
};

const percentDisplay = (value) => `${value.toFixed(1)}%`;

const isBlank = (value) => value === "" || value === null || value === undefined;

const coerceNumber = (value) => {
  const parsed = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
};

const generateId = () => `id-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

const createLineItem = (title = "New entry") => ({
  id: generateId(),
  title,
  perPay: "",
  note: ""
});

const sanitizeFilingStatus = (value) => (["single", "married", "hoh"].includes(value) ? value : "single");

const sanitizeLineItems = (items = []) =>
  (Array.isArray(items) ? items : [])
    .filter(Boolean)
    .map((item) => {
      const perPayRaw = item.perPay ?? item.perPayAmount ?? "";
      return {
        id: item.id ?? generateId(),
        title: item.title ?? item.label ?? "New entry",
        perPay: perPayRaw === "" ? "" : typeof perPayRaw === "string" ? perPayRaw : coerceNumber(perPayRaw),
        note: item.note ?? ""
      };
    });

const sanitizeTree = (nodes = []) =>
  nodes
    .filter(Boolean)
    .map((node) => {
      if (node.type === "section") {
        return {
          id: node.id ?? generateId(),
          type: "section",
          title: node.title ?? node.label ?? "New section",
          note: node.note ?? "",
          collapsed: Boolean(node.collapsed),
          targetPercent: coerceNumber(node.targetPercent),
          children: sanitizeTree(node.children || [])
        };
      }
      return {
        id: node.id ?? generateId(),
        type: "item",
        title: node.title ?? node.label ?? "New entry",
        percent: coerceNumber(node.percent),
        note: node.note ?? ""
      };
    });

const migrateLegacyBudget = (rows = []) => [
  {
    id: generateId(),
    type: "section",
    title: "Budget",
    note: "Migrated from flat budget",
    collapsed: false,
    children: Array.isArray(rows)
      ? rows.map((row) => ({
          id: generateId(),
          type: "item",
          title: row.label ?? "Entry",
          percent: coerceNumber(row.percent),
          note: row.note ?? ""
        }))
      : []
  }
];

const loadState = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return structuredClone(defaultState);

  const parsed = JSON.parse(stored);
  const merged = { ...defaultState, ...parsed };
  merged.collapsedCards = { ...defaultState.collapsedCards, ...(parsed.collapsedCards || {}) };
  if (Array.isArray(parsed.budgetTree)) {
    merged.budgetTree = sanitizeTree(parsed.budgetTree);
  } else if (Array.isArray(parsed.budget)) {
    merged.budgetTree = sanitizeTree(migrateLegacyBudget(parsed.budget));
  } else {
    merged.budgetTree = structuredClone(defaultBudgetTree);
  }

  const periods = Math.max(1, coerceNumber(merged.periodsPerYear) || 26);
  merged.stateFilingStatus = sanitizeFilingStatus(parsed.stateFilingStatus ?? merged.stateFilingStatus);
  merged.afterTaxDeductions = sanitizeLineItems(parsed.afterTaxDeductions);
  if (merged.afterTaxDeductions.length === 0) {
    const legacy = [];
    const grossPay = coerceNumber(parsed.salaryPerPay) || (coerceNumber(parsed.salaryAnnual) / periods || 0);
    const esppPercent = coerceNumber(parsed.esppPercent);
    if (grossPay > 0 && esppPercent > 0) {
      legacy.push({ title: "ESPP", perPay: grossPay * (esppPercent / 100) });
    }
    const ltdAnnual = coerceNumber(parsed.ltdAnnual);
    const ltdPerPay = coerceNumber(parsed.ltdPerPay);
    const ltdValue = ltdAnnual > 0 ? ltdAnnual / periods : ltdPerPay;
    if (ltdValue > 0) {
      legacy.push({ title: "LTD", perPay: ltdValue });
    }
    merged.afterTaxDeductions = sanitizeLineItems(legacy);
  }

  merged.additionalIncomeItems = sanitizeLineItems(parsed.additionalIncomeItems);
  if (merged.additionalIncomeItems.length === 0) {
    const legacyIncome = [];
    const rentAnnual = coerceNumber(parsed.rentAnnual);
    const rentPerPay = coerceNumber(parsed.rentPerPay);
    const rentValue = rentAnnual > 0 ? rentAnnual / periods : rentPerPay;
    if (rentValue > 0) legacyIncome.push({ title: "Rent stipend", perPay: rentValue, note: "Migrated" });

    const gymAnnual = coerceNumber(parsed.gymAnnual);
    const gymPerPay = coerceNumber(parsed.gymPerPay);
    const gymValue = gymAnnual > 0 ? gymAnnual / periods : gymPerPay;
    if (gymValue > 0) legacyIncome.push({ title: "Gym credit", perPay: gymValue, note: "Migrated" });

    const phoneAnnual = coerceNumber(parsed.phoneAnnual);
    const phonePerPay = coerceNumber(parsed.phonePerPay);
    const phoneValue = phoneAnnual > 0 ? phoneAnnual / periods : phonePerPay;
    if (phoneValue > 0) legacyIncome.push({ title: "Phone credit", perPay: phoneValue, note: "Migrated" });

    merged.additionalIncomeItems = sanitizeLineItems(legacyIncome);
  }

  return merged;
};

const saveState = (state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const calculateFederalAnnualTax = (annualTaxableIncome, flatRateOverride) => {
  if (Number.isFinite(flatRateOverride) && flatRateOverride > 0) {
    return annualTaxableIncome * flatRateOverride;
  }
  let tax = 0;
  let lowerBound = 0;

  for (const bracket of FEDERAL_BRACKETS_2025_SINGLE) {
    const upper = bracket.upTo;
    const rate = bracket.rate;
    const taxableInBracket = Math.min(annualTaxableIncome, upper) - lowerBound;
    if (taxableInBracket <= 0) break;
    tax += taxableInBracket * rate;
    if (annualTaxableIncome <= upper) break;
    lowerBound = upper;
  }

  return tax;
};

const findFederalBracket = (annualTaxableIncome) => {
  let lowerBound = 0;

  for (const bracket of FEDERAL_BRACKETS_2025_SINGLE) {
    const upper = bracket.upTo;
    if (annualTaxableIncome <= upper) {
      return { lower: lowerBound, upper, rate: bracket.rate };
    }
    lowerBound = upper;
  }

  return { lower: 0, upper: Infinity, rate: 0 };
};

const getStateBracketsForStatus = (status) => CA_BRACKETS_2025[sanitizeFilingStatus(status)] ?? CA_BRACKETS_2025.single;

const calculateStateAnnualTax = (annualTaxableIncome, flatRateOverride, filingStatus) => {
  if (Number.isFinite(flatRateOverride) && flatRateOverride > 0) {
    const base = annualTaxableIncome * flatRateOverride;
    const surcharge = Math.max(0, annualTaxableIncome - MENTAL_HEALTH_SURCHARGE_THRESHOLD) * MENTAL_HEALTH_SURCHARGE_RATE;
    return { base, surcharge, total: base + surcharge };
  }
  let tax = 0;
  let lowerBound = 0;

  const brackets = getStateBracketsForStatus(filingStatus);
  for (const bracket of brackets) {
    const upper = bracket.upTo;
    const rate = bracket.rate;
    const taxableInBracket = Math.min(annualTaxableIncome, upper) - lowerBound;
    if (taxableInBracket <= 0) break;
    tax += taxableInBracket * rate;
    if (annualTaxableIncome <= upper) break;
    lowerBound = upper;
  }

  const surcharge = Math.max(0, annualTaxableIncome - MENTAL_HEALTH_SURCHARGE_THRESHOLD) * MENTAL_HEALTH_SURCHARGE_RATE;
  return { base: tax, surcharge, total: tax + surcharge };
};

const findStateBracket = (annualTaxableIncome, filingStatus) => {
  let lowerBound = 0;

  const brackets = getStateBracketsForStatus(filingStatus);
  for (const bracket of brackets) {
    const upper = bracket.upTo;
    if (annualTaxableIncome <= upper) {
      return { lower: lowerBound, upper, rate: bracket.rate };
    }
    lowerBound = upper;
  }

  return { lower: 0, upper: Infinity, rate: 0 };
};

const rangeLabel = (lower, upper) => {
  const lowerLabel = currency(lower);
  if (!Number.isFinite(upper)) return `${lowerLabel} and up`;
  return `${lowerLabel} - ${currency(upper)}`;
};

const annualFromState = (state, annualKey, perPayKey, periods) => {
  const annualValue = coerceNumber(state[annualKey]);
  if (annualValue > 0) return annualValue;
  return coerceNumber(state[perPayKey]) * periods;
};

const recalcDerivedFields = (state) => {
  const periods = Math.max(1, coerceNumber(state.periodsPerYear));
  const pairs = [
    ["salaryAnnual", "salaryPerPay"],
    ["w4ExtraAnnual", "w4ExtraPerPay"],
    ["hsaAnnual", "hsaPerPay"],
    ["dentalAnnual", "dentalPerPay"],
    ["medicalAnnual", "medicalPerPay"],
    ["otherPretaxAnnual", "otherPretaxPerPay"]
  ];

  pairs.forEach(([annualKey, perPayKey]) => {
    const annualRaw = state[annualKey];
    const perPayRaw = state[perPayKey];
    const annualValue = coerceNumber(annualRaw);
    const perPayValue = coerceNumber(perPayRaw);
    const hasAnnual = !isBlank(annualRaw);
    const hasPerPay = !isBlank(perPayRaw);

    if (annualValue > 0) {
      state[perPayKey] = Math.round((annualValue / periods) * 100) / 100;
    } else if (perPayValue > 0) {
      state[annualKey] = Math.round(perPayValue * periods * 100) / 100;
    } else if (hasAnnual || hasPerPay) {
      state[annualKey] = hasAnnual ? annualValue : "";
      state[perPayKey] = hasPerPay ? perPayValue : "";
    } else {
      state[annualKey] = "";
      state[perPayKey] = "";
    }
  });
};

const updateInputsFromState = (state, options = {}) => {
  const skipActive = options.skipActive ?? false;
  const active = document.activeElement;
  document.querySelectorAll("[data-model]").forEach((input) => {
    const key = input.dataset.model;
    if (!(key in state)) return;
    const value = state[key];
    if (skipActive && active === input && !input.readOnly) return;
    input.value = value ?? "";
  });
};

const calculatePay = (state) => {
  const periods = Math.max(1, coerceNumber(state.periodsPerYear));
  const grossAnnual = Math.max(0, coerceNumber(state.salaryAnnual) || coerceNumber(state.salaryPerPay) * periods);
  const grossPay = grossAnnual / periods;

  const pretaxFrom401k = grossPay * (coerceNumber(state.k401Percent) / 100);
  const hsaAnnual = annualFromState(state, "hsaAnnual", "hsaPerPay", periods);
  const dentalAnnual = annualFromState(state, "dentalAnnual", "dentalPerPay", periods);
  const medicalAnnual = annualFromState(state, "medicalAnnual", "medicalPerPay", periods);
  const otherPretaxAnnual = annualFromState(state, "otherPretaxAnnual", "otherPretaxPerPay", periods);

  const hsaPerPay = hsaAnnual / periods;
  const dentalPerPay = dentalAnnual / periods;
  const medicalPerPay = medicalAnnual / periods;
  const otherPretaxPerPay = otherPretaxAnnual / periods;

  const pretax = pretaxFrom401k + hsaPerPay + dentalPerPay + medicalPerPay + otherPretaxPerPay;

  const standardDeductionPerPay = coerceNumber(state.standardDeductionAnnual) / periods;
  const taxableIncome = Math.max(0, grossPay - pretax - standardDeductionPerPay);
  const annualTaxable = taxableIncome * periods;

  const bracketOverrideRate = coerceNumber(state.federalBracketOverride);
  const bracketOverrideActive = Number.isFinite(bracketOverrideRate) && bracketOverrideRate > 0;
  const expectedFederalBracket = findFederalBracket(annualTaxable);
  const overrideRateDecimal = bracketOverrideActive ? bracketOverrideRate / 100 : null;
  const usedFederalRate = (overrideRateDecimal ?? expectedFederalBracket.rate) * 100;

  const federalTaxAnnual = calculateFederalAnnualTax(annualTaxable, overrideRateDecimal);
  const federalTaxFromPercent = taxableIncome * (coerceNumber(state.federalRate) / 100);
  const w4ExtraAnnual = annualFromState(state, "w4ExtraAnnual", "w4ExtraPerPay", periods);
  const federalFromBrackets = federalTaxAnnual / periods;
  const federalExtraPercent = federalTaxFromPercent;
  const federalExtraWithholding = w4ExtraAnnual / periods;
  const federalTax = federalFromBrackets + federalExtraPercent + federalExtraWithholding;

  const filingStatus = sanitizeFilingStatus(state.stateFilingStatus);
  const stateBracketOverrideRate = coerceNumber(state.stateBracketOverride);
  const stateOverrideActive = Number.isFinite(stateBracketOverrideRate) && stateBracketOverrideRate > 0;
  const expectedStateBracket = findStateBracket(annualTaxable, filingStatus);
  const stateOverrideDecimal = stateOverrideActive ? stateBracketOverrideRate / 100 : null;
  const usedStateRate = (stateOverrideDecimal ?? expectedStateBracket.rate) * 100;
  const stateTaxAnnuals = calculateStateAnnualTax(annualTaxable, stateOverrideDecimal, filingStatus);
  const stateExtraAnnual = annualTaxable * (coerceNumber(state.stateRate) / 100);
  const stateTaxBase = stateTaxAnnuals.base / periods;
  const stateMentalHealth = stateTaxAnnuals.surcharge / periods;
  const stateTax = (stateTaxAnnuals.total + stateExtraAnnual) / periods;

  const socialSecurityTax =
    (Math.min(annualTaxable, SOCIAL_SECURITY_WAGE_BASE) * (coerceNumber(state.socialSecurityRate) / 100)) / periods;
  const medicareTax = (annualTaxable * (coerceNumber(state.medicareRate) / 100)) / periods;
  const medicareSurtaxRate = coerceNumber(state.medicareSurtaxRate) / 100;
  const medicareSurtaxThreshold = coerceNumber(state.medicareSurtaxThreshold) || MEDICARE_SURTAX_DEFAULT_THRESHOLD;
  const medicareSurtaxAnnual = Math.max(0, annualTaxable - medicareSurtaxThreshold) * medicareSurtaxRate;
  const medicareSurtax = medicareSurtaxAnnual / periods;
  const sdiTax = taxableIncome * (coerceNumber(state.sdiRate) / 100);
  const taxes = federalTax + stateTax + socialSecurityTax + medicareTax + medicareSurtax + sdiTax;

  const afterTaxPerPay = state.afterTaxDeductions.reduce((sum, item) => sum + coerceNumber(item.perPay), 0);
  const postTax = afterTaxPerPay;

  const additionalIncome = state.additionalIncomeItems.reduce((sum, item) => sum + coerceNumber(item.perPay), 0);
  const netPay = grossPay - pretax - taxes - postTax + additionalIncome;

  const toMonth = (value) => (value * periods) / 12;
  const toYear = (value) => value * periods;
  const bundle = (value) => ({ pay: value, month: toMonth(value), year: toYear(value) });

  return {
    gross: bundle(grossPay),
    pretax: bundle(pretax),
    taxable: bundle(taxableIncome),
    taxes: bundle(taxes),
    posttax: bundle(postTax),
    additionalIncome: bundle(additionalIncome),
    net: bundle(netPay),
    details: {
      grossAnnual,
      standardDeductionAnnual: coerceNumber(state.standardDeductionAnnual),
      annualTaxable,
      expectedFederalBracket,
      usedFederalRate,
      expectedStateBracket,
      usedStateRate,
      stateFilingStatus: filingStatus,
      effectiveFederalRate:
        annualTaxable > 0 ? (calculateFederalAnnualTax(annualTaxable, overrideRateDecimal) / annualTaxable) * 100 : 0,
      pretaxBreakdown: {
        retirement401k: bundle(pretaxFrom401k),
        hsa: bundle(hsaPerPay),
        dental: bundle(dentalPerPay),
        medical: bundle(medicalPerPay),
        other: bundle(otherPretaxPerPay)
      },
      postTaxBreakdown: {
        items: state.afterTaxDeductions.map((item) => ({ label: item.title, bundle: bundle(coerceNumber(item.perPay)) }))
      },
      additionalBreakdown: {
        items: state.additionalIncomeItems.map((item) => ({ label: item.title, bundle: bundle(coerceNumber(item.perPay)) }))
      },
      taxBreakdown: {
        federalBracket: bundle(federalFromBrackets),
        federalExtraPercent: bundle(federalExtraPercent),
        federalW4: bundle(federalExtraWithholding),
        stateBase: bundle(stateTaxBase),
        stateMentalHealth: bundle(stateMentalHealth),
        state: bundle(stateTax),
        socialSecurity: bundle(socialSecurityTax),
        medicare: bundle(medicareTax),
        medicareSurtax: bundle(medicareSurtax),
        sdi: bundle(sdiTax)
      }
    }
  };
};

const createValueGroup = (values) => `
  <span>${currency(values.pay)}</span>
  <span>${currency(values.month)}</span>
  <span>${currency(values.year)}</span>
`;

const renderSummary = (calculated) => {
  const mapping = [
    ["gross", calculated.gross],
    ["pretax", calculated.pretax],
    ["taxable", calculated.taxable],
    ["taxes", calculated.taxes],
    ["posttax", calculated.posttax],
    ["additionalIncome", calculated.additionalIncome],
    ["net", calculated.net]
  ];

  mapping.forEach(([key, values]) => {
    const el = document.querySelector(`[data-output="${key}"]`);
    if (el) {
      el.innerHTML = createValueGroup(values);
    }
  });

  renderSummaryBreakdown(
    document.querySelector('[data-output="taxesBreakdown"]'),
    calculated.details.taxBreakdown,
    [
      ["federalBracket", "Federal (marginal)"],
      ["federalExtraPercent", "Federal extra %"],
      ["federalW4", "Federal W-4 extra"],
      ["stateBase", "CA base tax"],
      ["stateMentalHealth", "CA mental health surcharge"],
      ["state", "State"],
      ["socialSecurity", "Social Security"],
      ["medicare", "Medicare"],
      ["medicareSurtax", "Medicare surtax"],
      ["sdi", "State disability / VDI"]
    ]
  );
};

const renderSummaryBreakdown = (target, breakdown, entries = []) => {
  if (!target || !breakdown) return;
  target.innerHTML = "";
  entries.forEach(([key, label]) => {
    const bundle = breakdown[key];
    if (!bundle) return;

    const row = document.createElement("div");
    row.className = "breakdown-row";

    const labelEl = document.createElement("div");
    labelEl.className = "breakdown-label";
    labelEl.textContent = label;

    const valuesEl = document.createElement("div");
    valuesEl.className = "values breakdown-values";
    valuesEl.innerHTML = createValueGroup(bundle);

    row.appendChild(labelEl);
    row.appendChild(valuesEl);
    target.appendChild(row);
  });
};

const renderTaxFields = (calculated) => {
  const { details } = calculated;
  const {
    expectedFederalBracket,
    usedFederalRate,
    expectedStateBracket,
    usedStateRate,
    stateFilingStatus
  } = details;
  const bracketLabel = `${usedFederalRate.toFixed(1)}% marginal (${rangeLabel(
    expectedFederalBracket.lower,
    expectedFederalBracket.upper
  )})`;
  const stateBracketLabel = `${usedStateRate.toFixed(1)}% marginal (${rangeLabel(
    expectedStateBracket.lower,
    expectedStateBracket.upper
  )}) (${CA_FILING_LABELS[sanitizeFilingStatus(stateFilingStatus)]})`;

  const bracketField = document.querySelector('[data-output="federalBracket"]');
  if (bracketField) bracketField.textContent = bracketLabel;
  const stateBracketField = document.querySelector('[data-output="stateBracket"]');
  if (stateBracketField) stateBracketField.textContent = stateBracketLabel;
};

const captureActiveField = (container) => {
  const active = document.activeElement;
  if (!container || !container.contains(active)) return null;
  const row = active.closest("[data-id]");
  if (!row) return null;
  const field = active.dataset.field;
  if (!field) return null;
  return {
    id: row.dataset.id,
    field,
    selectionStart: active.selectionStart,
    selectionEnd: active.selectionEnd
  };
};

const restoreActiveField = (container, focusState) => {
  if (!container || !focusState) return;
  const target = container.querySelector(`[data-id="${focusState.id}"] [data-field="${focusState.field}"]`);
  if (!target) return;
  target.focus({ preventScroll: true });
  if (
    typeof focusState.selectionStart === "number" &&
    typeof focusState.selectionEnd === "number" &&
    target.setSelectionRange
  ) {
    const start = Math.min(focusState.selectionStart, target.value.length);
    const end = Math.min(focusState.selectionEnd, target.value.length);
    target.setSelectionRange(start, end);
  }
};

const renderLineItemList = (items, containerId, periods, emptyText) => {
  const container = document.getElementById(containerId);
  if (!container) return;
  const focusState = captureActiveField(container);
  container.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = emptyText ?? "No entries yet.";
    container.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "simple-row";
    row.dataset.id = item.id;

    const title = document.createElement("input");
    title.type = "text";
    title.value = item.title ?? "";
    title.placeholder = "Label";
    title.dataset.field = "title";

    const perPay = document.createElement("input");
    perPay.type = "text";
    perPay.inputMode = "decimal";
    perPay.inputPattern = "[0-9]*[.,]?[0-9]*";
    perPay.value =
      item.perPay === "" ? "" : typeof item.perPay === "string" ? item.perPay : coerceNumber(item.perPay).toString();
    perPay.dataset.field = "perPay";

    const annual = document.createElement("span");
    annual.className = "simple-row__annual";
    annual.textContent = currency(coerceNumber(item.perPay) * periods);

    const note = document.createElement("input");
    note.type = "text";
    note.value = item.note ?? "";
    note.placeholder = "Note";
    note.dataset.field = "note";

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "action-chip danger";
    remove.textContent = "Delete";
    remove.dataset.action = "delete";

    row.appendChild(title);
    row.appendChild(perPay);
    row.appendChild(annual);
    row.appendChild(note);
    row.appendChild(remove);
    container.appendChild(row);
  });

  restoreActiveField(container, focusState);
};

const updateLineItem = (list, id, field, value) => {
  const item = list.find((entry) => entry.id === id);
  if (!item) return false;
  if (field === "title") item.title = value;
  if (field === "note") item.note = value;
  if (field === "perPay") item.perPay = value;
  return true;
};

const bindLineItemList = (state, config) => {
  const { containerId, addButtonId, listKey } = config;
  const container = document.getElementById(containerId);
  const addButton = document.getElementById(addButtonId);
  if (container) {
    container.addEventListener("input", (event) => {
      const field = event.target.dataset.field;
      if (!field) return;
      const row = event.target.closest(".simple-row");
      if (!row) return;
      const updated = updateLineItem(state[listKey], row.dataset.id, field, event.target.value);
      if (updated) {
        saveState(state);
        refreshBudget(state);
      }
    });

    container.addEventListener("click", (event) => {
      const action = event.target.dataset.action;
      if (action !== "delete") return;
      const row = event.target.closest(".simple-row");
      if (!row) return;
      const index = state[listKey].findIndex((item) => item.id === row.dataset.id);
      if (index >= 0) {
        state[listKey].splice(index, 1);
        saveState(state);
        refreshBudget(state);
      }
    });
  }

  if (addButton) {
    addButton.addEventListener("click", () => {
      state[listKey].push(createLineItem());
      saveState(state);
      refreshBudget(state);
    });
  }
};

const calculateNodeTotals = (node, netMonthly) => {
  if (node.type === "item") {
    const percent = coerceNumber(node.percent);
    const amount = netMonthly > 0 ? (netMonthly * percent) / 100 : 0;
    return { percent, amount };
  }

  return (node.children || []).reduce(
    (acc, child) => {
      const totals = calculateNodeTotals(child, netMonthly);
      acc.percent += totals.percent;
      acc.amount += totals.amount;
      return acc;
    },
    { percent: 0, amount: 0 }
  );
};

const calculateTreeTotals = (tree, netMonthly) =>
  tree.reduce(
    (acc, node) => {
      const totals = calculateNodeTotals(node, netMonthly);
      acc.percent += totals.percent;
      acc.amount += totals.amount;
      return acc;
    },
    { percent: 0, amount: 0 }
  );

const calculateSectionTargets = (tree, netMonthly) => {
  const targets = [];
  const visit = (nodes) => {
    nodes.forEach((node) => {
      if (node.type === "section") {
        const totals = calculateNodeTotals(node, netMonthly);
        const target = coerceNumber(node.targetPercent);
        const delta = totals.percent - target;
        targets.push({
          id: node.id,
          title: node.title ?? "Section",
          target,
          actual: totals.percent,
          monthly: totals.amount,
          delta
        });
        visit(node.children || []);
      }
    });
  };
  visit(tree);
  return targets;
};

const flattenBudgetItems = (nodes, netMonthly, prefix = "") =>
  nodes.reduce((list, node) => {
    const label = prefix ? `${prefix} › ${node.title ?? "Untitled"}` : node.title ?? "Untitled";
    if (node.type === "item") {
      const percent = coerceNumber(node.percent);
      const monthly = netMonthly > 0 ? (netMonthly * percent) / 100 : 0;
      list.push({ label, percent, monthly, annual: monthly * 12 });
    }
    if (node.type === "section") {
      list.push(...flattenBudgetItems(node.children || [], netMonthly, label));
    }
    return list;
  }, []);

let categoryBarChart;
let categoryPieChart;

const baseChartColors = [
  "#7c3aed",
  "#22d3ee",
  "#f472b6",
  "#f59e0b",
  "#34d399",
  "#60a5fa",
  "#c084fc",
  "#f87171",
  "#a3e635",
  "#fb7185"
];

const buildOrUpdateChart = (chartRef, ctx, config) => {
  if (chartRef) {
    chartRef.data = config.data;
    chartRef.options = { ...chartRef.options, ...config.options };
    chartRef.update();
    return chartRef;
  }
  return new Chart(ctx, config);
};

const renderInsightStats = (calculations, totals) => {
  const netAnnual = calculations.net.year;
  const netMonthly = calculations.net.month;
  const plannedMonthly = totals.amount;
  const plannedAnnual = plannedMonthly * 12;
  const unassignedMonthly = netMonthly - plannedMonthly;
  const unassignedAnnual = unassignedMonthly * 12;

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setText("net-annual-stat", currency(netAnnual));
  setText("net-monthly-stat", `Monthly: ${currency(netMonthly)}`);
  setText("planned-annual-stat", currency(plannedAnnual));
  setText("planned-monthly-stat", `Monthly: ${currency(plannedMonthly)}`);
  setText("unassigned-annual-stat", currency(unassignedAnnual));
  setText("unassigned-monthly-stat", `Monthly: ${currency(unassignedMonthly)}`);
};

const renderCategoryCharts = (state, calculations) => {
  const netMonthly = calculations.net.month;
  const items = flattenBudgetItems(state.budgetTree, netMonthly);
  const labels = items.map((item) => item.label);
  const amounts = items.map((item) => item.annual);
  const percents = items.map((item) => item.percent);

  const barCtx = document.getElementById("category-bar-chart");
  if (barCtx) {
    categoryBarChart = buildOrUpdateChart(categoryBarChart, barCtx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Annual amount",
            data: amounts,
            backgroundColor: labels.map((_, idx) => baseChartColors[idx % baseChartColors.length]),
            borderRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${currency(context.parsed.y)}`
            }
          }
        },
        scales: {
          x: { ticks: { color: "#e5e7eb" } },
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => currency(value)
            }
          }
        }
      }
    });
  }

  const pieCtx = document.getElementById("category-pie-chart");
  if (pieCtx) {
    categoryPieChart = buildOrUpdateChart(categoryPieChart, pieCtx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: percents,
            backgroundColor: labels.map((_, idx) => baseChartColors[idx % baseChartColors.length])
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom", labels: { color: "#e5e7eb" } },
          tooltip: {
            callbacks: {
              label: (context) => `${context.label}: ${percentDisplay(context.parsed)}`
            }
          }
        }
      }
    });
  }
};

const renderBucketTargets = (state, calculations, targets) => {
  const container = document.getElementById("bucket-targets");
  if (!container) return;

  const targetEntries = targets ?? calculateSectionTargets(state.budgetTree, calculations.net.month);
  container.innerHTML = "";

  if (targetEntries.length === 0) {
    container.textContent = "Add a section to start tracking targets.";
    return;
  }

  targetEntries.forEach((entry) => {
    const card = document.createElement("div");
    card.className = "bucket-target";

    const header = document.createElement("div");
    header.className = "bucket-target__header";
    const title = document.createElement("p");
    title.className = "bucket-target__title";
    title.textContent = entry.title;
    const monthly = document.createElement("p");
    monthly.className = "bucket-target__amount";
    monthly.textContent = currency(entry.monthly);
    header.appendChild(title);
    header.appendChild(monthly);

    const progress = document.createElement("div");
    progress.className = "bucket-target__row";
    const target = document.createElement("span");
    target.textContent = `Target: ${percentDisplay(entry.target || 0)}`;
    const actual = document.createElement("span");
    actual.textContent = `Planned: ${percentDisplay(entry.actual)}`;
    progress.appendChild(target);
    progress.appendChild(actual);

    const delta = document.createElement("p");
    delta.className = `bucket-target__delta ${entry.delta > 0 ? "over" : entry.delta < 0 ? "under" : ""}`;
    if (entry.delta > 0) {
      delta.textContent = `Over target by ${percentDisplay(entry.delta)}`;
    } else if (entry.delta < 0) {
      delta.textContent = `Under target by ${percentDisplay(Math.abs(entry.delta))}`;
    } else {
      delta.textContent = "On target";
    }

    card.appendChild(header);
    card.appendChild(progress);
    card.appendChild(delta);
    container.appendChild(card);
  });
};

const renderCharts = (state, calculations, totals, targets) => {
  renderInsightStats(calculations, totals);
  renderCategoryCharts(state, calculations);
  renderBucketTargets(state, calculations, targets);
};

const updatePeekBadges = (state, calculations, totals, targets) => {
  const { details } = calculations;

  const incomePeek = document.getElementById("peek-income");
  if (incomePeek) {
    incomePeek.innerHTML = `
      <span>Per paycheck: ${currency(calculations.gross.pay)}</span>
      <span>Annual: ${currency(calculations.gross.year)}</span>
    `;
  }

  const pretaxPeek = document.getElementById("peek-pretax");
  if (pretaxPeek) {
    pretaxPeek.innerHTML = `
      <span>Per paycheck: ${currency(calculations.pretax.pay)}</span>
      <span>Annual: ${currency(calculations.pretax.year)}</span>
    `;
  }

  const posttaxPeek = document.getElementById("peek-posttax");
  if (posttaxPeek) {
    posttaxPeek.innerHTML = `
      <span>Per paycheck: ${currency(calculations.posttax.pay)}</span>
      <span>Annual: ${currency(calculations.posttax.year)}</span>
      <span>${state.afterTaxDeductions.length || 0} deduction${state.afterTaxDeductions.length === 1 ? "" : "s"}</span>
    `;
  }

  const taxesPeek = document.getElementById("peek-taxes");
  if (taxesPeek) {
    const filingLabel = CA_FILING_LABELS[sanitizeFilingStatus(details.stateFilingStatus)];
    const federalLabel = `${details.usedFederalRate.toFixed(1)}% fed (${rangeLabel(
      details.expectedFederalBracket.lower,
      details.expectedFederalBracket.upper
    )})`;
    const stateLabel = `${details.usedStateRate.toFixed(1)}% CA (${filingLabel})`;
    taxesPeek.innerHTML = `
      <span>${federalLabel}</span>
      <span>${stateLabel}</span>
      <span>Withheld: ${currency(calculations.taxes.pay)} / pay · ${currency(calculations.taxes.year)} / yr</span>
    `;
  }

  const additionalPeek = document.getElementById("peek-additional");
  if (additionalPeek) {
    additionalPeek.innerHTML = `
      <span>Total: ${currency(calculations.additionalIncome.pay)} / pay · ${currency(calculations.additionalIncome.year)} / yr</span>
      <span>${state.additionalIncomeItems.length || 0} income item${state.additionalIncomeItems.length === 1 ? "" : "s"}</span>
    `;
  }

  const summaryPeek = document.getElementById("peek-summary");
  if (summaryPeek) {
    summaryPeek.innerHTML = `
      <span>Gross: ${currency(calculations.gross.month)} / mo · ${currency(calculations.gross.year)} / yr</span>
      <span>Net: ${currency(calculations.net.month)} / mo · ${currency(calculations.net.year)} / yr</span>
    `;
  }

  const budgetPeek = document.getElementById("peek-budget");
  if (budgetPeek) {
    const unused = calculations.net.month - totals.amount;
    const unusedLabel = unused >= 0 ? "Unused" : "Over";
    budgetPeek.innerHTML = `
      <span>Planned: ${percentDisplay(totals.percent)} (${currency(totals.amount)} / mo)</span>
      <span>${unusedLabel}: ${currency(Math.abs(unused))} / mo</span>
    `;
  }

  const bucketPeek = document.getElementById("peek-bucket-targets");
  if (bucketPeek) {
    const over = targets.filter((t) => t.delta > 0);
    const under = targets.filter((t) => t.delta < 0);
    const biggest = targets.reduce(
      (current, entry) => {
        const overage = entry.delta;
        if (Math.abs(overage) > Math.abs(current.delta)) return entry;
        return current;
      },
      { delta: 0, title: "" }
    );

    const biggestLabel =
      biggest && biggest.title
        ? `${biggest.title}: ${biggest.delta > 0 ? "+" : "-"}${percentDisplay(Math.abs(biggest.delta))}`
        : "—";

    bucketPeek.innerHTML = `
      <span>Over target: ${over.length}</span>
      <span>Under target: ${under.length}</span>
      <span>Largest gap: ${biggestLabel}</span>
    `;
  }
};

const findNodeContext = (nodes, id, parent = null) => {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (node.id === id) return { node, parent, index, collection: nodes };
    if (node.type === "section") {
      const childResult = findNodeContext(node.children || [], id, node);
      if (childResult) return childResult;
    }
  }
  return null;
};

const createItem = () => ({ id: generateId(), type: "item", title: "New entry", percent: 0, note: "" });
const createSection = () => ({
  id: generateId(),
  type: "section",
  title: "New section",
  note: "",
  collapsed: false,
  targetPercent: 0,
  children: [createItem()]
});

const renderBudgetTree = (state, netMonthly, config) => {
  const { treeId, percentTotalId, amountTotalId, unusedId } = config;
  const container = document.getElementById(treeId);
  if (!container) return;

  const focusState = captureActiveField(container);

  container.innerHTML = "";

  const buildRow = (node, depth) => {
    const totals = calculateNodeTotals(node, netMonthly);

    const row = document.createElement("div");
    row.className = "budget-row tree-row";
    row.dataset.id = node.id;
    row.dataset.type = node.type;
    row.style.setProperty("--depth", depth);

    const labelCell = document.createElement("div");
    labelCell.className = "cell label-cell";
    const labelStack = document.createElement("div");
    labelStack.className = "label-stack";

    if (node.type === "section") {
      const toggle = document.createElement("button");
      toggle.className = "icon-button toggle";
      toggle.dataset.action = "toggle";
      toggle.title = node.collapsed ? "Expand section" : "Collapse section";
      toggle.textContent = node.collapsed ? "▶" : "▼";
      labelStack.appendChild(toggle);
    } else {
      const spacer = document.createElement("span");
      spacer.className = "toggle-spacer";
      spacer.textContent = "";
      labelStack.appendChild(spacer);
    }

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.dataset.field = "title";
    labelInput.value = node.title ?? "";
    labelStack.appendChild(labelInput);

    labelCell.appendChild(labelStack);
    row.appendChild(labelCell);

    const targetCell = document.createElement("div");
    targetCell.className = "cell target-cell";
    if (node.type === "section") {
      const targetInput = document.createElement("input");
      targetInput.type = "number";
      targetInput.step = "0.1";
      targetInput.inputMode = "decimal";
      targetInput.dataset.field = "targetPercent";
      targetInput.value = coerceNumber(node.targetPercent).toFixed(1);
      targetCell.appendChild(targetInput);
    } else {
      targetCell.textContent = "—";
    }
    row.appendChild(targetCell);

    const percentCell = document.createElement("div");
    percentCell.className = "cell percent-cell";
    if (node.type === "item") {
      const percentInput = document.createElement("input");
      percentInput.type = "number";
      percentInput.step = "0.1";
      percentInput.inputMode = "decimal";
      percentInput.dataset.field = "percent";
      percentInput.value = coerceNumber(node.percent).toFixed(1);
      percentCell.appendChild(percentInput);
    } else {
      const badge = document.createElement("span");
      badge.className = "total-pill";
      badge.textContent = percentDisplay(totals.percent);
      percentCell.appendChild(badge);
    }
    row.appendChild(percentCell);

    const amountCell = document.createElement("div");
    amountCell.className = "cell amount-cell";
    if (node.type === "item") {
      const amountInput = document.createElement("input");
      amountInput.type = "number";
      amountInput.step = "0.01";
      amountInput.inputMode = "decimal";
      amountInput.dataset.field = "amount";
      amountInput.value = totals.amount.toFixed(2);
      amountCell.appendChild(amountInput);
    } else {
      const badge = document.createElement("span");
      badge.className = "total-pill";
      badge.textContent = currency(totals.amount);
      amountCell.appendChild(badge);
    }
    row.appendChild(amountCell);

    const noteCell = document.createElement("div");
    noteCell.className = "cell note-cell";
    const noteInput = document.createElement("input");
    noteInput.type = "text";
    noteInput.dataset.field = "note";
    noteInput.value = node.note ?? "";
    noteCell.appendChild(noteInput);

    const actions = document.createElement("div");
    actions.className = "row-actions";

    if (node.type === "section") {
      const addEntry = document.createElement("button");
      addEntry.className = "action-chip";
      addEntry.dataset.action = "add-item";
      addEntry.textContent = "+ Entry";
      actions.appendChild(addEntry);

      const addSection = document.createElement("button");
      addSection.className = "action-chip";
      addSection.dataset.action = "add-section";
      addSection.textContent = "+ Subsection";
      actions.appendChild(addSection);
    }

    const moveUp = document.createElement("button");
    moveUp.className = "action-chip ghost";
    moveUp.dataset.action = "move-up";
    moveUp.textContent = "↑";
    actions.appendChild(moveUp);

    const moveDown = document.createElement("button");
    moveDown.className = "action-chip ghost";
    moveDown.dataset.action = "move-down";
    moveDown.textContent = "↓";
    actions.appendChild(moveDown);

    const indent = document.createElement("button");
    indent.className = "action-chip ghost";
    indent.dataset.action = "indent";
    indent.textContent = "→";
    actions.appendChild(indent);

    const outdent = document.createElement("button");
    outdent.className = "action-chip ghost";
    outdent.dataset.action = "outdent";
    outdent.textContent = "←";
    actions.appendChild(outdent);

    const remove = document.createElement("button");
    remove.className = "action-chip danger";
    remove.dataset.action = "delete";
    remove.textContent = "Delete";
    actions.appendChild(remove);

    noteCell.appendChild(actions);
    row.appendChild(noteCell);

    container.appendChild(row);

    if (node.type === "section" && !node.collapsed) {
      (node.children || []).forEach((child) => buildRow(child, depth + 1));
    }
  };

  state.budgetTree.forEach((node) => buildRow(node, 0));

  const totals = calculateTreeTotals(state.budgetTree, netMonthly);
  const percentTotalEl = document.getElementById(percentTotalId);
  const amountTotalEl = document.getElementById(amountTotalId);
  const unusedEl = document.getElementById(unusedId);
  if (percentTotalEl) percentTotalEl.textContent = percentDisplay(totals.percent);
  if (amountTotalEl) amountTotalEl.textContent = currency(totals.amount);
  if (unusedEl) {
    const unused = netMonthly - totals.amount;
    unusedEl.textContent =
      netMonthly > 0 ? `${unused >= 0 ? "Unused" : "Over budget"}: ${currency(unused)}` : "Enter pay details to see unused amounts.";
  }

  restoreActiveField(container, focusState);
};

const rebalanceBudgetTree = (state) => {
  const gatherItems = (nodes) =>
    nodes.reduce((list, node) => {
      if (node.type === "item") list.push(node);
      if (node.type === "section") list.push(...gatherItems(node.children || []));
      return list;
    }, []);

  const items = gatherItems(state.budgetTree);
  const total = items.reduce((sum, item) => sum + coerceNumber(item.percent), 0);
  if (total === 0) {
    state.budgetTree = structuredClone(defaultBudgetTree);
    return;
  }

  items.forEach((item) => {
    item.percent = (coerceNumber(item.percent) / total) * 100;
  });
};

const refreshBudget = (state) => {
  const periods = Math.max(1, coerceNumber(state.periodsPerYear));
  const calculations = calculatePay(state);
  const netMonthly = calculations.net.month;
  renderLineItemList(state.afterTaxDeductions, "after-tax-list", periods, "Add an after-tax deduction to get started.");
  renderLineItemList(state.additionalIncomeItems, "additional-income-list", periods, "Add income credits or stipends.");
  renderSummary(calculations);
  renderTaxFields(calculations);
  renderBudgetTree(state, netMonthly, {
    treeId: "budget-tree",
    percentTotalId: "budget-percent-total",
    amountTotalId: "budget-amount-total",
    unusedId: "unused-money"
  });
  const totals = calculateTreeTotals(state.budgetTree, netMonthly);
  const targets = calculateSectionTargets(state.budgetTree, netMonthly);
  renderCharts(state, calculations, totals, targets);
  updatePeekBadges(state, calculations, totals, targets);
};

const attachModelInputs = (state) => {
  const inputs = document.querySelectorAll("[data-model]");
  inputs.forEach((input) => {
    const key = input.dataset.model;
    if (!(key in state)) return;
    input.value = state[key] ?? "";

    if (input.readOnly) return;

    input.addEventListener("input", () => {
      const raw = input.value;
      const numeric = coerceNumber(raw);
      state[key] = raw === "" ? "" : numeric;
      recalcDerivedFields(state);
      saveState(state);
      updateInputsFromState(state, { skipActive: true });
      refreshBudget(state);
    });
  });
};

const handleBudgetInput = (state, event) => {
  const target = event.target;
  const row = target.closest(".tree-row");
  if (!row) return;

  const field = target.dataset.field;
  if (!field) return;
  const context = findNodeContext(state.budgetTree, row.dataset.id);
  if (!context) return;
  const { node } = context;

  if (field === "title") {
    node.title = target.value;
  } else if (field === "note") {
    node.note = target.value;
  } else if (field === "percent" && node.type === "item") {
    node.percent = coerceNumber(target.value);
  } else if (field === "amount" && node.type === "item") {
    const calculations = calculatePay(state);
    const netMonthly = calculations.net.month;
    const amountValue = coerceNumber(target.value);
    node.percent = netMonthly > 0 ? (amountValue / netMonthly) * 100 : 0;
  } else if (field === "targetPercent" && node.type === "section") {
    node.targetPercent = coerceNumber(target.value);
  }

  saveState(state);
  refreshBudget(state);
};

const moveWithinCollection = (collection, fromIndex, toIndex) => {
  if (toIndex < 0 || toIndex >= collection.length) return false;
  const [item] = collection.splice(fromIndex, 1);
  collection.splice(toIndex, 0, item);
  return true;
};

const handleBudgetAction = (state, action, context) => {
  const { node, parent, index, collection } = context;

  if (action === "toggle" && node.type === "section") {
    node.collapsed = !node.collapsed;
    return true;
  }

  if (action === "delete") {
    collection.splice(index, 1);
    if (state.budgetTree.length === 0) {
      state.budgetTree.push(createSection());
    }
    return true;
  }

  if (action === "add-item" && node.type === "section") {
    node.children.push(createItem());
    node.collapsed = false;
    return true;
  }

  if (action === "add-section" && node.type === "section") {
    node.children.push(createSection());
    node.collapsed = false;
    return true;
  }

  if (action === "move-up") {
    return moveWithinCollection(collection, index, index - 1);
  }

  if (action === "move-down") {
    return moveWithinCollection(collection, index, index + 1);
  }

  if (action === "indent") {
    const prevSibling = collection[index - 1];
    if (!prevSibling || prevSibling.type !== "section") return false;
    collection.splice(index, 1);
    prevSibling.children = prevSibling.children || [];
    prevSibling.children.push(node);
    prevSibling.collapsed = false;
    return true;
  }

  if (action === "outdent" && parent) {
    const grandParentContext = findNodeContext(state.budgetTree, parent.id);
    if (!grandParentContext) return false;
    const { parent: grandParent, collection: ancestorCollection, index: parentIndex } = grandParentContext;

    parent.children.splice(index, 1);
    if (grandParent) {
      ancestorCollection.splice(parentIndex + 1, 0, node);
    } else {
      // parent is root level
      state.budgetTree.splice(parentIndex + 1, 0, node);
    }
    return true;
  }

  return false;
};

const bindBudgetListeners = (state, config) => {
  const { treeId, addEntryId, addSectionId, rebalanceId } = config;
  const tree = document.getElementById(treeId);
  if (!tree) return;

  tree.addEventListener("input", (event) => handleBudgetInput(state, event));

  tree.addEventListener("click", (event) => {
    const action = event.target.dataset.action;
    if (!action) return;

    const row = event.target.closest(".tree-row");
    if (!row) return;

    const context = findNodeContext(state.budgetTree, row.dataset.id);
    if (!context) return;

    const changed = handleBudgetAction(state, action, context);
    if (changed) {
      saveState(state);
      refreshBudget(state);
    }
  });

  const addSectionButton = document.getElementById(addSectionId);
  if (addSectionButton) {
    addSectionButton.addEventListener("click", () => {
      state.budgetTree.push(createSection());
      saveState(state);
      refreshBudget(state);
    });
  }

  const addEntryButton = document.getElementById(addEntryId);
  if (addEntryButton) {
    addEntryButton.addEventListener("click", () => {
      state.budgetTree.push(createItem());
      saveState(state);
      refreshBudget(state);
    });
  }

  const rebalanceButton = document.getElementById(rebalanceId);
  if (rebalanceButton) {
    rebalanceButton.addEventListener("click", () => {
      rebalanceBudgetTree(state);
      saveState(state);
      refreshBudget(state);
    });
  }
};

const resetState = (state) => {
  const fresh = structuredClone(defaultState);
  Object.keys(state).forEach((key) => delete state[key]);
  Object.assign(state, fresh);
  saveState(state);
};

const applyCardCollapse = (state) => {
  document.querySelectorAll("[data-collapsible]").forEach((card) => {
    const key = card.dataset.collapsible;
    const collapsed = Boolean(state.collapsedCards?.[key]);
    const toggle = card.querySelector(`[data-collapsible-toggle=\"${key}\"]`);
    if (collapsed) {
      card.classList.add("collapsed");
    } else {
      card.classList.remove("collapsed");
    }
    if (toggle) {
      toggle.textContent = collapsed ? "Expand" : "Collapse";
      toggle.setAttribute("aria-expanded", (!collapsed).toString());
    }
  });
};

const init = () => {
  const state = loadState();
  recalcDerivedFields(state);
  updateInputsFromState(state);
  saveState(state);
  attachModelInputs(state);
  refreshBudget(state);
  bindLineItemList(state, { containerId: "after-tax-list", addButtonId: "add-after-tax", listKey: "afterTaxDeductions" });
  bindLineItemList(state, {
    containerId: "additional-income-list",
    addButtonId: "add-additional-income",
    listKey: "additionalIncomeItems"
  });
  bindBudgetListeners(state, {
    treeId: "budget-tree",
    addEntryId: "add-entry-button",
    addSectionId: "add-section-button",
    rebalanceId: "rebalance-button"
  });
  applyCardCollapse(state);

  const resetButton = document.getElementById("reset-button");
  resetButton.addEventListener("click", () => {
    resetState(state);
    recalcDerivedFields(state);
    updateInputsFromState(state);
    refreshBudget(state);
    applyCardCollapse(state);
  });

  const tabButtons = document.querySelectorAll(".view-tabs .tab");
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.viewTarget;
      document.querySelectorAll(".view").forEach((view) => {
        view.classList.toggle("active", view.id === `${target}-view`);
      });
      tabButtons.forEach((btn) => btn.classList.toggle("active", btn === button));
    });
  });

  document.querySelectorAll("[data-collapsible-toggle]").forEach((button) => {
    const key = button.dataset.collapsibleToggle;
    button.addEventListener("click", () => {
      state.collapsedCards[key] = !state.collapsedCards[key];
      saveState(state);
      applyCardCollapse(state);
    });
  });
};

window.addEventListener("DOMContentLoaded", init);
