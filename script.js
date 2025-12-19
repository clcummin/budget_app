const STORAGE_KEY = "budget-planner-state-v3";
const SOCIAL_SECURITY_WAGE_BASE = 168600; // 2024 wage base

const FEDERAL_BRACKETS_2024_SINGLE = [
  { upTo: 11600, rate: 0.1 },
  { upTo: 47150, rate: 0.12 },
  { upTo: 100525, rate: 0.22 },
  { upTo: 191950, rate: 0.24 },
  { upTo: 243725, rate: 0.32 },
  { upTo: 609350, rate: 0.35 },
  { upTo: Infinity, rate: 0.37 }
];

const defaultBudgetTree = [
  {
    id: "section-housing",
    type: "section",
    title: "Housing",
    note: "Mortgage/rent, HOA, utilities, taxes",
    collapsed: false,
    children: [
      { id: "item-primary", type: "item", title: "Home - primary", percent: 28.1, note: "Mortgage/rent, HOA, water, taxes" },
      {
        id: "section-california",
        type: "section",
        title: "California housing",
        note: "Rent + utilities",
        collapsed: false,
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
    children: [
      { id: "item-savings", type: "item", title: "Savings", percent: 17.4, note: "Reserve, vacations, long-term" }
    ]
  }
];

const defaultState = {
  salaryAnnual: 0,
  salaryPerPay: 0,
  periodsPerYear: 26,
  standardDeductionAnnual: 14600,
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
  stateRate: 6,
  socialSecurityRate: 6.2,
  medicareRate: 1.45,
  sdiRate: 1,
  ltdAnnual: 0,
  ltdPerPay: 0,
  esppPercent: 5,
  rentAnnual: 0,
  rentPerPay: 0,
  gymAnnual: 0,
  gymPerPay: 0,
  phoneAnnual: 0,
  phonePerPay: 0,
  budgetTree: structuredClone(defaultBudgetTree)
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

const coerceNumber = (value) => {
  const parsed = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
};

const generateId = () => `id-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

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
  if (Array.isArray(parsed.budgetTree)) {
    merged.budgetTree = sanitizeTree(parsed.budgetTree);
  } else if (Array.isArray(parsed.budget)) {
    merged.budgetTree = sanitizeTree(migrateLegacyBudget(parsed.budget));
  } else {
    merged.budgetTree = structuredClone(defaultBudgetTree);
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

  for (const bracket of FEDERAL_BRACKETS_2024_SINGLE) {
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

  for (const bracket of FEDERAL_BRACKETS_2024_SINGLE) {
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
    ["otherPretaxAnnual", "otherPretaxPerPay"],
    ["ltdAnnual", "ltdPerPay"],
    ["rentAnnual", "rentPerPay"],
    ["gymAnnual", "gymPerPay"],
    ["phoneAnnual", "phonePerPay"]
  ];

  pairs.forEach(([annualKey, perPayKey]) => {
    const annualValue = coerceNumber(state[annualKey]);
    const perPayValue = coerceNumber(state[perPayKey]);
    if (annualValue > 0) {
      state[perPayKey] = Math.round((annualValue / periods) * 100) / 100;
    } else if (perPayValue > 0) {
      state[annualKey] = Math.round(perPayValue * periods * 100) / 100;
    } else {
      state[annualKey] = 0;
      state[perPayKey] = 0;
    }
  });
};

const updateInputsFromState = (state) => {
  document.querySelectorAll("[data-model]").forEach((input) => {
    const key = input.dataset.model;
    if (!(key in state)) return;
    const value = state[key];
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
  const federalTax = federalTaxAnnual / periods + federalTaxFromPercent + w4ExtraAnnual / periods;

  const stateTax = taxableIncome * (coerceNumber(state.stateRate) / 100);
  const socialSecurityTax =
    (Math.min(annualTaxable, SOCIAL_SECURITY_WAGE_BASE) * (coerceNumber(state.socialSecurityRate) / 100)) / periods;
  const medicareTax = (annualTaxable * (coerceNumber(state.medicareRate) / 100)) / periods;
  const sdiTax = taxableIncome * (coerceNumber(state.sdiRate) / 100);
  const taxes = federalTax + stateTax + socialSecurityTax + medicareTax + sdiTax;

  const espp = grossPay * (coerceNumber(state.esppPercent) / 100);
  const ltdAnnual = annualFromState(state, "ltdAnnual", "ltdPerPay", periods);
  const ltdPerPay = ltdAnnual / periods;
  const postTax = espp + ltdPerPay;

  const rentAnnual = annualFromState(state, "rentAnnual", "rentPerPay", periods);
  const gymAnnual = annualFromState(state, "gymAnnual", "gymPerPay", periods);
  const phoneAnnual = annualFromState(state, "phoneAnnual", "phonePerPay", periods);

  const rentPerPay = rentAnnual / periods;
  const gymPerPay = gymAnnual / periods;
  const phonePerPay = phoneAnnual / periods;

  const additionalIncome = rentPerPay + gymPerPay + phonePerPay;
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
        espp: bundle(espp),
        ltd: bundle(ltdPerPay)
      },
      additionalBreakdown: {
        rent: bundle(rentPerPay),
        gym: bundle(gymPerPay),
        phone: bundle(phonePerPay)
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
};

const renderBreakdownList = (target, breakdown, labelMap) => {
  if (!target) return;
  target.innerHTML = "";
  Object.entries(breakdown).forEach(([key, bundle]) => {
    const label = labelMap[key] ?? key;
    const item = document.createElement("li");
    item.textContent = `${label}: ${currency(bundle.year)} / yr (${currency(bundle.month)} / mo)`;
    target.appendChild(item);
  });
};

const renderSnapshot = (calculated) => {
  const { details } = calculated;
  const { expectedFederalBracket, usedFederalRate, effectiveFederalRate } = details;
  const bracketLabel = `${usedFederalRate.toFixed(1)}% marginal (${rangeLabel(
    expectedFederalBracket.lower,
    expectedFederalBracket.upper
  )})`;

  const bracketField = document.querySelector('[data-output="federalBracket"]');
  if (bracketField) bracketField.textContent = bracketLabel;
  const bracketTile = document.querySelector('[data-output="federalBracketLabel"]');
  if (bracketTile) bracketTile.textContent = bracketLabel;

  const effectiveField = document.querySelector('[data-output="effectiveFederal"]');
  if (effectiveField) effectiveField.textContent = `Effective: ${effectiveFederalRate.toFixed(1)}% of taxable income`;

  const pretaxTotal = document.querySelector('[data-output="pretaxTotal"]');
  if (pretaxTotal) pretaxTotal.textContent = `${currency(calculated.pretax.year)} / yr`;
  const posttaxTotal = document.querySelector('[data-output="posttaxTotal"]');
  if (posttaxTotal) posttaxTotal.textContent = `${currency(calculated.posttax.year)} / yr`;
  const additionalTotal = document.querySelector('[data-output="additionalTotal"]');
  if (additionalTotal) additionalTotal.textContent = `${currency(calculated.additionalIncome.year)} / yr`;

  renderBreakdownList(
    document.querySelector('[data-output="pretaxBreakdown"]'),
    details.pretaxBreakdown,
    {
      retirement401k: "Retirement (401k)",
      hsa: "HSA",
      dental: "Dental",
      medical: "Medical",
      other: "Other"
    }
  );
  renderBreakdownList(
    document.querySelector('[data-output="posttaxBreakdown"]'),
    details.postTaxBreakdown,
    { espp: "ESPP", ltd: "LTD" }
  );
  renderBreakdownList(
    document.querySelector('[data-output="additionalBreakdown"]'),
    details.additionalBreakdown,
    { rent: "Rent stipend", gym: "Gym credit", phone: "Phone credit" }
  );
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
const createSection = () => ({ id: generateId(), type: "section", title: "New section", note: "", collapsed: false, children: [createItem()] });

const renderBudgetTree = (state, netMonthly) => {
  const container = document.getElementById("budget-tree");
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

    const percentCell = document.createElement("div");
    percentCell.className = "cell percent-cell";
    if (node.type === "item") {
      const percentInput = document.createElement("input");
      percentInput.type = "number";
      percentInput.step = "0.1";
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
      amountInput.step = "1";
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
  document.getElementById("budget-percent-total").textContent = percentDisplay(totals.percent);
  document.getElementById("budget-amount-total").textContent = currency(totals.amount);
  const unused = netMonthly - totals.amount;
  document.getElementById("unused-money").textContent =
    netMonthly > 0 ? `${unused >= 0 ? "Unused" : "Over budget"}: ${currency(unused)}` : "Enter pay details to see unused amounts.";
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
  const calculations = calculatePay(state);
  renderSummary(calculations);
  renderSnapshot(calculations);
  renderBudgetTree(state, calculations.net.month);
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
      state[key] = raw === "" ? 0 : numeric;
      recalcDerivedFields(state);
      saveState(state);
      updateInputsFromState(state);
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

const bindBudgetListeners = (state) => {
  const tree = document.getElementById("budget-tree");

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

  const addSectionButton = document.getElementById("add-section-button");
  addSectionButton.addEventListener("click", () => {
    state.budgetTree.push(createSection());
    saveState(state);
    refreshBudget(state);
  });

  const addEntryButton = document.getElementById("add-entry-button");
  addEntryButton.addEventListener("click", () => {
    state.budgetTree.push(createItem());
    saveState(state);
    refreshBudget(state);
  });
};

const resetState = (state) => {
  const fresh = structuredClone(defaultState);
  Object.keys(state).forEach((key) => delete state[key]);
  Object.assign(state, fresh);
  saveState(state);
};

const init = () => {
  const state = loadState();
  recalcDerivedFields(state);
  updateInputsFromState(state);
  saveState(state);
  attachModelInputs(state);
  refreshBudget(state);
  bindBudgetListeners(state);

  const resetButton = document.getElementById("reset-button");
  resetButton.addEventListener("click", () => {
    resetState(state);
    recalcDerivedFields(state);
    updateInputsFromState(state);
    refreshBudget(state);
  });

  const rebalanceButton = document.getElementById("rebalance-button");
  rebalanceButton.addEventListener("click", () => {
    rebalanceBudgetTree(state);
    saveState(state);
    refreshBudget(state);
  });
};

window.addEventListener("DOMContentLoaded", init);
