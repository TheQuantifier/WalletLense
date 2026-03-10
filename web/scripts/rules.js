import { api } from "./api.js";
import { applyRulesToRecord, loadRules, saveRules, summarizeRule } from "./rules-engine.js";

document.addEventListener("DOMContentLoaded", () => {
  const rulesList = document.getElementById("rulesList");
  const rulesEmpty = document.getElementById("rulesEmpty");
  const rulesStatus = document.getElementById("rulesStatus");
  const btnCreateRule = document.getElementById("btnCreateRule");
  const btnCreateRuleEmpty = document.getElementById("btnCreateRuleEmpty");
  const btnApplyRules = document.getElementById("btnApplyRules");

  const ruleModal = document.getElementById("ruleModal");
  const ruleForm = document.getElementById("ruleForm");
  const ruleModalTitle = document.getElementById("ruleModalTitle");
  const ruleCancelBtn = document.getElementById("ruleCancelBtn");
  const ruleSaveBtn = document.getElementById("ruleSaveBtn");

  const els = {
    name: document.getElementById("ruleName"),
    priority: document.getElementById("rulePriority"),
    applyMode: document.getElementById("ruleApplyMode"),
    enabled: document.getElementById("ruleEnabled"),
    type: document.getElementById("ruleType"),
    category: document.getElementById("ruleCategory"),
    noteContains: document.getElementById("ruleNoteContains"),
    origin: document.getElementById("ruleOrigin"),
    amountMin: document.getElementById("ruleAmountMin"),
    amountMax: document.getElementById("ruleAmountMax"),
    actionCategory: document.getElementById("actionCategory"),
    actionTag: document.getElementById("actionTag"),
  };

  const EXPENSE_CATEGORIES = [
    "Housing",
    "Utilities",
    "Groceries",
    "Transportation",
    "Dining",
    "Health",
    "Entertainment",
    "Shopping",
    "Membership",
    "Miscellaneous",
    "Education",
    "Giving",
    "Savings",
    "Other",
  ];

  const INCOME_CATEGORIES = [
    "Salary / Wages",
    "Bonus / Commission",
    "Business Income",
    "Freelance / Contract",
    "Rental Income",
    "Interest / Dividends",
    "Capital Gains",
    "Refunds / Reimbursements",
    "Gifts Received",
    "Government Benefits",
    "Other",
  ];

  const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

  const showStatus = (msg, kind = "ok") => {
    if (!rulesStatus) return;
    rulesStatus.textContent = msg;
    rulesStatus.classList.remove("is-hidden");
    rulesStatus.classList.toggle("is-ok", kind === "ok");
    rulesStatus.classList.toggle("is-error", kind === "error");
  };

  const clearStatus = () => {
    if (!rulesStatus) return;
    rulesStatus.classList.add("is-hidden");
    rulesStatus.textContent = "";
  };

  const showModal = () => ruleModal?.classList.remove("hidden");
  const hideModal = () => ruleModal?.classList.add("hidden");

  const populateCategoryOptions = async () => {
    let customExpense = [];
    let customIncome = [];
    try {
      const { user } = await api.auth.me();
      customExpense = user?.customExpenseCategories || user?.custom_expense_categories || [];
      customIncome = user?.customIncomeCategories || user?.custom_income_categories || [];
    } catch {
      customExpense = [];
      customIncome = [];
    }

    const combined = uniq([
      ...EXPENSE_CATEGORIES,
      ...INCOME_CATEGORIES,
      ...customExpense,
      ...customIncome,
    ]);

    const fill = (select, includeAny) => {
      if (!select) return;
      const baseOptions = includeAny ? [""] : [""];
      select.innerHTML = "";
      baseOptions.forEach((val) => {
        const opt = document.createElement("option");
        opt.value = val;
        opt.textContent = includeAny ? (val === "" ? "Any" : val) : val === "" ? "No change" : val;
        select.appendChild(opt);
      });
      combined.forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        select.appendChild(opt);
      });
    };

    fill(els.category, true);
    fill(els.actionCategory, false);
  };

  const buildRuleFromForm = () => {
    const conditions = [];
    if (els.type?.value && els.type.value !== "any") {
      conditions.push({ field: "type", op: "equals", value: els.type.value });
    }
    if (els.category?.value) {
      conditions.push({ field: "category", op: "equals", value: els.category.value });
    }
    if (els.noteContains?.value) {
      conditions.push({ field: "note", op: "contains", value: els.noteContains.value });
    }
    if (els.origin?.value && els.origin.value !== "any") {
      conditions.push({ field: "origin", op: "equals", value: els.origin.value });
    }

    const min = els.amountMin?.value;
    const max = els.amountMax?.value;
    if (min || max) {
      conditions.push({ field: "amount", op: "between", value: { min, max } });
    }

    const actions = [];
    if (els.actionCategory?.value) {
      actions.push({ type: "setCategory", value: els.actionCategory.value });
    }
    if (els.actionTag?.value) {
      actions.push({ type: "appendNote", value: els.actionTag.value });
    }

    return { conditions, actions };
  };

  const renderRules = () => {
    const rules = loadRules();
    if (!rulesList) return;

    rulesList.innerHTML = "";
    if (!rules.length) {
      rulesEmpty?.classList.remove("is-hidden");
      return;
    }
    rulesEmpty?.classList.add("is-hidden");

    rules.forEach((rule) => {
      const card = document.createElement("div");
      card.className = "rule-card";

      const header = document.createElement("div");
      const title = document.createElement("h3");
      title.textContent = rule.name || "Untitled Rule";
      header.appendChild(title);

      const pill = document.createElement("span");
      pill.className = "rule-pill";
      pill.textContent = rule.enabled === false ? "Disabled" : "Enabled";

      const meta = document.createElement("div");
      meta.className = "rule-meta";
      meta.textContent = summarizeRule(rule) || "No details";

      const toggle = document.createElement("label");
      toggle.className = "rule-toggle";
      const toggleInput = document.createElement("input");
      toggleInput.type = "checkbox";
      toggleInput.checked = rule.enabled !== false;
      toggleInput.addEventListener("change", () => {
        const next = loadRules().map((r) =>
          r.id === rule.id ? { ...r, enabled: toggleInput.checked } : r
        );
        saveRules(next);
        renderRules();
      });
      toggle.appendChild(toggleInput);
      toggle.appendChild(document.createTextNode("Enabled"));

      const actions = document.createElement("div");
      actions.className = "rule-actions";

      const editBtn = document.createElement("button");
      editBtn.className = "btn";
      editBtn.type = "button";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => openEdit(rule));

      const delBtn = document.createElement("button");
      delBtn.className = "btn";
      delBtn.type = "button";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", () => {
        if (!confirm("Delete this rule?")) return;
        const next = loadRules().filter((r) => r.id !== rule.id);
        saveRules(next);
        renderRules();
        showStatus("Rule deleted.");
      });

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      card.appendChild(pill);
      card.appendChild(header);
      card.appendChild(meta);
      card.appendChild(toggle);
      card.appendChild(actions);
      rulesList.appendChild(card);
    });
  };

  const resetForm = () => {
    ruleForm?.reset();
    if (els.priority) els.priority.value = "100";
    if (els.applyMode) els.applyMode.value = "first";
    if (els.enabled) els.enabled.checked = true;
    ruleForm?.setAttribute("data-edit-id", "");
  };

  const openCreate = () => {
    resetForm();
    ruleModalTitle.textContent = "Create Rule";
    showModal();
    clearStatus();
  };

  const openEdit = (rule) => {
    resetForm();
    ruleModalTitle.textContent = "Edit Rule";
    ruleForm?.setAttribute("data-edit-id", rule.id || "");
    if (els.name) els.name.value = rule.name || "";
    if (els.priority) els.priority.value = String(rule.priority || 100);
    if (els.applyMode) els.applyMode.value = rule.applyMode || "first";
    if (els.enabled) els.enabled.checked = rule.enabled !== false;

    (rule.conditions || []).forEach((c) => {
      if (c.field === "type") els.type.value = c.value || "any";
      if (c.field === "category") els.category.value = c.value || "";
      if (c.field === "note") els.noteContains.value = c.value || "";
      if (c.field === "origin") els.origin.value = c.value || "any";
      if (c.field === "amount") {
        if (c.value?.min) els.amountMin.value = c.value.min;
        if (c.value?.max) els.amountMax.value = c.value.max;
      }
    });

    (rule.actions || []).forEach((a) => {
      if (a.type === "setCategory") els.actionCategory.value = a.value || "";
      if (a.type === "appendNote") els.actionTag.value = a.value || "";
    });

    showModal();
  };

  const prefillFromQuery = () => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("prefill")) return;

    openCreate();
    const type = params.get("type");
    const category = params.get("category");
    const note = params.get("note");
    const amount = params.get("amount");
    const origin = params.get("origin");

    if (type && els.type) els.type.value = type;
    if (category && els.category) els.category.value = category;
    if (note && els.noteContains) els.noteContains.value = note;
    if (origin && els.origin) els.origin.value = origin;
    if (amount && els.amountMin) els.amountMin.value = amount;

    if (els.name) {
      const trimmedNote = note ? note.slice(0, 24) : "record";
      els.name.value = `Auto: ${category || "category"} for ${trimmedNote}`;
    }
  };

  ruleForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    clearStatus();

    const name = els.name?.value?.trim();
    if (!name) {
      showStatus("Please enter a rule name.", "error");
      return;
    }

    const { conditions, actions } = buildRuleFromForm();
    if (!conditions.length) {
      showStatus("Add at least one condition.", "error");
      return;
    }
    if (!actions.length) {
      showStatus("Add at least one action.", "error");
      return;
    }

    const rules = loadRules();
    const editId = ruleForm?.getAttribute("data-edit-id");
    const rule = {
      id: editId || `rule_${Date.now()}`,
      name,
      enabled: !!els.enabled?.checked,
      priority: Number(els.priority?.value || 100),
      applyMode: els.applyMode?.value || "first",
      conditions,
      actions,
      updatedAt: new Date().toISOString(),
    };

    const next = editId
      ? rules.map((r) => (r.id === editId ? { ...r, ...rule } : r))
      : [...rules, rule];

    saveRules(next);
    hideModal();
    renderRules();
    showStatus(editId ? "Rule updated." : "Rule created.");
  });

  ruleCancelBtn?.addEventListener("click", () => hideModal());
  btnCreateRule?.addEventListener("click", openCreate);
  btnCreateRuleEmpty?.addEventListener("click", openCreate);

  btnApplyRules?.addEventListener("click", async () => {
    clearStatus();
    const rules = loadRules();
    if (!rules.length) {
      showStatus("No rules to apply.", "error");
      return;
    }
    if (!confirm("Apply all rules to existing records? This may update categories and notes.")) {
      return;
    }

    try {
      btnApplyRules.disabled = true;
      btnApplyRules.textContent = "Applying…";

      const list = await api.records.getAll();
      const records = Array.isArray(list) ? list : (list?.records || list?.data || []);

      let updated = 0;
      for (const record of records) {
        const updatedRecord = applyRulesToRecord(record, rules);
        const patch = {};
        if ((record.category || "") !== (updatedRecord.category || "")) patch.category = updatedRecord.category;
        if ((record.note || "") !== (updatedRecord.note || "")) patch.note = updatedRecord.note;
        if ((record.type || "") !== (updatedRecord.type || "")) patch.type = updatedRecord.type;
        if (Object.keys(patch).length) {
          await api.records.update(record.id || record._id, patch);
          updated += 1;
        }
      }

      showStatus(`Applied rules to ${updated} record${updated === 1 ? "" : "s"}.`);
    } catch (err) {
      showStatus(`Failed to apply rules: ${err?.message || "Unknown error"}`, "error");
    } finally {
      btnApplyRules.disabled = false;
      btnApplyRules.textContent = "Apply To Existing";
    }
  });

  populateCategoryOptions().then(() => {
    renderRules();
    prefillFromQuery();
  });
});
