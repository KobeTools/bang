const triggerInput = document.getElementById("trigger");
const nameInput = document.getElementById("name");
const urlTemplateInput = document.getElementById("urlTemplate");
const addBtn = document.getElementById("addBtn");
const statusEl = document.getElementById("status");
const listEl = document.getElementById("customBangList");
const metaEl = document.getElementById("meta");

function showStatus(message, type) {
  statusEl.textContent = message || "";
  statusEl.className = type ? type : "";
}

function normalizeTrigger(trigger) {
  return String(trigger || "").trim().toLowerCase();
}

function validateInput(trigger, name, urlTemplate) {
  if (!trigger) return "Trigger is required.";
  if (/\s/.test(trigger)) return "Trigger cannot contain spaces.";
  if (!name) return "Name is required.";
  if (!urlTemplate) return "URL template is required.";
  if (!urlTemplate.includes("%s")) return "URL template must include %s placeholder.";

  try {
    new URL(urlTemplate.replace("%s", "test"));
  } catch {
    return "URL template is invalid.";
  }

  return null;
}

async function loadCustomBangs() {
  const { customBangs = [] } = await chrome.storage.local.get({ customBangs: [] });
  return Array.isArray(customBangs) ? customBangs : [];
}

async function saveCustomBangs(customBangs) {
  await chrome.storage.local.set({ customBangs });
}

function createListRow(item, index, onDelete) {
  const row = document.createElement("div");
  row.className = "list-row";

  const trigger = document.createElement("code");
  trigger.textContent = `!${item.trigger}`;

  const name = document.createElement("div");
  name.textContent = item.name;

  const url = document.createElement("a");
  url.href = item.urlTemplate.replace("%s", "example");
  url.textContent = item.urlTemplate;
  url.target = "_blank";
  url.rel = "noopener noreferrer";
  url.style.color = "#93c5fd";
  url.style.overflowWrap = "anywhere";

  const del = document.createElement("button");
  del.className = "danger";
  del.textContent = "Delete";
  del.addEventListener("click", () => onDelete(index));

  row.append(trigger, name, url, del);
  return row;
}

async function render() {
  const customBangs = await loadCustomBangs();
  listEl.innerHTML = "";

  if (customBangs.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No custom bangs yet.";
    empty.style.color = "#9ca3af";
    listEl.appendChild(empty);
  } else {
    customBangs.forEach((item, index) => {
      listEl.appendChild(
        createListRow(item, index, async (deleteIndex) => {
          const latest = await loadCustomBangs();
          latest.splice(deleteIndex, 1);
          await saveCustomBangs(latest);
          showStatus("Custom bang deleted.", "success");
          await render();
        })
      );
    });
  }

  metaEl.textContent = `${customBangs.length} custom bang${customBangs.length === 1 ? "" : "s"} saved.`;
}

addBtn.addEventListener("click", async () => {
  const trigger = normalizeTrigger(triggerInput.value);
  const name = String(nameInput.value || "").trim();
  const urlTemplate = String(urlTemplateInput.value || "").trim();

  const error = validateInput(trigger, name, urlTemplate);
  if (error) {
    showStatus(error, "error");
    return;
  }

  const customBangs = await loadCustomBangs();
  const duplicateIndex = customBangs.findIndex((item) => normalizeTrigger(item.trigger) === trigger);

  const payload = {
    trigger,
    name,
    urlTemplate
  };

  if (duplicateIndex >= 0) {
    customBangs[duplicateIndex] = payload;
    showStatus("Existing trigger updated.", "success");
  } else {
    customBangs.push(payload);
    showStatus("Custom bang added.", "success");
  }

  await saveCustomBangs(customBangs);

  triggerInput.value = "";
  nameInput.value = "";
  urlTemplateInput.value = "";
  await render();
});

document.addEventListener("DOMContentLoaded", () => {
  render().catch((err) => {
    console.error(err);
    showStatus("Failed to load custom bangs.", "error");
  });
});
