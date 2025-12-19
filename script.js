const STORAGE_KEY = "budget-planner-state-v1";

const defaultState = {
  salaryPerPay: 0,
  periodsPerYear: 26,
  standardDeductionAnnual: 14600,
  w4ExtraPerPay: 0,
  k401Percent: 0,
  hsaPerPay: 0,
  dentalPerPay: 0,
  medicalPerPay: 0,
  otherPretaxPerPay: 0,
  federalRate: 22,
  stateRate: 6,
  socialSecurityRate: 6.2,
  medicareRate: 1.45,
  sdiRate: 1,
  ltdPerPay: 0,
  esppPercent: 5,
  rentPerPay: 0,
  gymPerPay: 0,
  phonePerPay: 0,
  budget: [
    { label: "Home - primary", percent: 28.1, note: "Mortgage/rent, HOA, water, taxes" },
    { label: "California housing", percent: 29.4, note: "Rent + utilities" },
    { label: "Transportation", percent: 13.5, note: "Gas, car payment, insurance, parking" },
    { label: "Debt", percent: 3.6, note: "Cards and student loans" },
    { label: "Additional expenses", percent: 7, note: "Subscriptions, memberships, misc" },
    { label: "Charitable donations", percent: 1, note: "Monthly giving" },
    { label: "Savings", percent: 17.4, note: "Reserve, vacations, long-term" }
  ]
};

const currency = (value) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  });

const percentDisplay = (value) => `${value.toFixed(1)}%`;

const coerceNumber = (value) => {
  const parsed = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
};

const loadState = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return structuredClone(defaultState);

  const parsed = JSON.parse(stored);
  const merged = { ...defaultState, ...parsed };
  merged.budget = Array.isArray(parsed.budget) ? parsed.budget.map((row) => ({
    label: row.label ?? "",
    percent: coerceNumber(row.percent),
    note: row.note ?? ""
  })) : structuredClone(defaultState.budget);
  return merged;
};

const saveState = (state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const calculatePay = (state) => {
  const periods = Math.max(1, coerceNumber(state.periodsPerYear));
  const grossPay = coerceNumber(state.salaryPerPay);

  const pretaxFrom401k = grossPay * (coerceNumber(state.k401Percent) / 100);
  const pretax =
    pretaxFrom401k +
    coerceNumber(state.hsaPerPay) +
    coerceNumber(state.dentalPerPay) +
    coerceNumber(state.medicalPerPay) +
    coerceNumber(state.otherPretaxPerPay);

  const standardDeductionPerPay = coerceNumber(state.standardDeductionAnnual) / periods;
  const taxableIncome = Math.max(0, grossPay - pretax - standardDeductionPerPay);

  const federalTax = taxableIncome * (coerceNumber(state.federalRate) / 100) + coerceNumber(state.w4ExtraPerPay);
  const stateTax = taxableIncome * (coerceNumber(state.stateRate) / 100);
  const socialSecurityTax = taxableIncome * (coerceNumber(state.socialSecurityRate) / 100);
  const medicareTax = taxableIncome * (coerceNumber(state.medicareRate) / 100);
  const sdiTax = taxableIncome * (coerceNumber(state.sdiRate) / 100);
  const taxes = federalTax + stateTax + socialSecurityTax + medicareTax + sdiTax;

  const espp = grossPay * (coerceNumber(state.esppPercent) / 100);
  const postTax = espp + coerceNumber(state.ltdPerPay);

  const additionalIncome = coerceNumber(state.rentPerPay) + coerceNumber(state.gymPerPay) + coerceNumber(state.phonePerPay);
  const netPay = grossPay - pretax - taxes - postTax + additionalIncome;

  const toMonth = (value) => (value * periods) / 12;
  const toYear = (value) => value * periods;

  return {
    gross: { pay: grossPay, month: toMonth(grossPay), year: toYear(grossPay) },
    pretax: { pay: pretax, month: toMonth(pretax), year: toYear(pretax) },
    taxable: { pay: taxableIncome, month: toMonth(taxableIncome), year: toYear(taxableIncome) },
    taxes: { pay: taxes, month: toMonth(taxes), year: toYear(taxes) },
    posttax: { pay: postTax, month: toMonth(postTax), year: toYear(postTax) },
    additionalIncome: { pay: additionalIncome, month: toMonth(additionalIncome), year: toYear(additionalIncome) },
    net: { pay: netPay, month: toMonth(netPay), year: toYear(netPay) }
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

const renderBudget = (state, netMonthly) => {
  const budgetRows = document.getElementById("budget-rows");
  budgetRows.innerHTML = "";

  let totalPercent = 0;
  let totalAmount = 0;

  state.budget.forEach((row, index) => {
    const safePercent = coerceNumber(row.percent);
    const amount = netMonthly > 0 ? (netMonthly * safePercent) / 100 : 0;
    totalPercent += safePercent;
    totalAmount += amount;

    const wrapper = document.createElement("div");
    wrapper.className = "budget-row";
    wrapper.innerHTML = `
      <input type="text" data-index="${index}" data-field="label" value="${row.label ?? ""}" />
      <input type="number" step="0.1" data-index="${index}" data-field="percent" value="${safePercent.toFixed(1)}" />
      <input type="number" step="1" data-index="${index}" data-field="amount" value="${amount.toFixed(2)}" />
      <input type="text" data-index="${index}" data-field="note" value="${row.note ?? ""}" />
    `;

    budgetRows.append(wrapper);
  });

  document.getElementById("budget-percent-total").textContent = `${totalPercent.toFixed(1)}%`;
  document.getElementById("budget-amount-total").textContent = currency(totalAmount);
  const unused = netMonthly - totalAmount;
  document.getElementById("unused-money").textContent =
    netMonthly > 0 ? `${unused >= 0 ? "Unused" : "Over budget"}: ${currency(unused)}` : "Enter pay details to see unused amounts.";
};

const bindBudgetListeners = (state) => {
  const budgetRows = document.getElementById("budget-rows");
  budgetRows.addEventListener("input", (event) => {
    const target = event.target;
    const index = Number(target.dataset.index);
    const field = target.dataset.field;
    if (!Number.isInteger(index) || !field) return;

    const current = calculatePay(state);
    const netMonthly = current.net.month;

    if (field === "label" || field === "note") {
      state.budget[index][field] = target.value;
    } else if (field === "percent") {
      state.budget[index].percent = coerceNumber(target.value);
    } else if (field === "amount") {
      const amountValue = coerceNumber(target.value);
      const newPercent = netMonthly > 0 ? (amountValue / netMonthly) * 100 : 0;
      state.budget[index].percent = newPercent;
    }

    saveState(state);
    const calculations = calculatePay(state);
    renderSummary(calculations);
    renderBudget(state, calculations.net.month);
  });
};

const rebalanceBudget = (state) => {
  const total = state.budget.reduce((sum, row) => sum + coerceNumber(row.percent), 0);
  if (total === 0) {
    state.budget = structuredClone(defaultState.budget);
    return;
  }

  state.budget = state.budget.map((row) => ({
    ...row,
    percent: (coerceNumber(row.percent) / total) * 100
  }));
};

const attachModelInputs = (state) => {
  const inputs = document.querySelectorAll("[data-model]");
  inputs.forEach((input) => {
    const key = input.dataset.model;
    if (!(key in state)) return;
    input.value = state[key];

    input.addEventListener("input", () => {
      state[key] = coerceNumber(input.value);
      saveState(state);
      const calculations = calculatePay(state);
      renderSummary(calculations);
      renderBudget(state, calculations.net.month);
    });
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
  attachModelInputs(state);
  const calculations = calculatePay(state);
  renderSummary(calculations);
  renderBudget(state, calculations.net.month);
  bindBudgetListeners(state);

  const resetButton = document.getElementById("reset-button");
  resetButton.addEventListener("click", () => {
    resetState(state);
    document.querySelectorAll("[data-model]").forEach((input) => {
      input.value = state[input.dataset.model];
    });
    const updated = calculatePay(state);
    renderSummary(updated);
    renderBudget(state, updated.net.month);
  });

  const rebalanceButton = document.getElementById("rebalance-button");
  rebalanceButton.addEventListener("click", () => {
    rebalanceBudget(state);
    saveState(state);
    const refreshed = calculatePay(state);
    renderSummary(refreshed);
    renderBudget(state, refreshed.net.month);
  });
};

window.addEventListener("DOMContentLoaded", init);
