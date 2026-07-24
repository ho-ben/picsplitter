import { calculateGrid } from "./splitter.js";

const $ = (selector) => document.querySelector(selector);
const elements = {
  dropZone: $("#dropZone"), fileInput: $("#fileInput"), chooseButton: $("#chooseButton"),
  editor: $("#editor"), previewCanvas: $("#previewCanvas"), fileName: $("#fileName"),
  imageMeta: $("#imageMeta"), columnsValue: $("#columnsValue"), rowsValue: $("#rowsValue"),
  tileCount: $("#tileCount"), splitCount: $("#splitCount"), trimBorders: $("#trimBorders"),
  tolerance: $("#tolerance"), toleranceValue: $("#toleranceValue"), toleranceRow: $("#toleranceRow"),
  replaceButton: $("#replaceButton"), splitButton: $("#splitButton"), statusMessage: $("#statusMessage"),
  results: $("#results"), resultGrid: $("#resultGrid"), downloadAllButton: $("#downloadAllButton"),
  startOverButton: $("#startOverButton")
};

const state = {
  image: null, imageData: null, sourceCanvas: null, file: null,
  rows: 2, columns: 2, outputs: []
};

function setCount() {
  const count = state.rows * state.columns;
  elements.rowsValue.value = state.rows;
  elements.columnsValue.value = state.columns;
  elements.tileCount.textContent = `${count} photo${count === 1 ? "" : "s"}`;
  elements.splitCount.textContent = count;
}

function getGrid() {
  return calculateGrid(state.imageData, state.rows, state.columns, {
    trim: elements.trimBorders.checked,
    tolerance: Number(elements.tolerance.value)
  });
}

function drawPreview() {
  if (!state.image) return;
  const maxDisplay = 1100;
  const scale = Math.min(1, maxDisplay / Math.max(state.image.naturalWidth, state.image.naturalHeight));
  const canvas = elements.previewCanvas;
  canvas.width = Math.round(state.image.naturalWidth * scale);
  canvas.height = Math.round(state.image.naturalHeight * scale);
  const context = canvas.getContext("2d");
  context.drawImage(state.image, 0, 0, canvas.width, canvas.height);

  const { tiles } = getGrid();
  context.save();
  context.scale(canvas.width / state.image.naturalWidth, canvas.height / state.image.naturalHeight);
  context.lineWidth = Math.max(2, 3 / scale);
  context.strokeStyle = "#ef5a32";
  context.setLineDash([10 / scale, 7 / scale]);
  for (const tile of tiles) context.strokeRect(tile.x, tile.y, tile.width, tile.height);
  context.restore();
}

function revokeOutputs() {
  state.outputs.forEach(({ url }) => URL.revokeObjectURL(url));
  state.outputs = [];
}

async function loadFile(file) {
  if (!file?.type.startsWith("image/")) {
    elements.statusMessage.innerHTML = "<span>!</span><p>Please choose an image file.</p>";
    return;
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  image.onload = () => {
    URL.revokeObjectURL(url);
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = image.naturalWidth;
    sourceCanvas.height = image.naturalHeight;
    const context = sourceCanvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0);

    state.image = image;
    state.imageData = context.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    state.sourceCanvas = sourceCanvas;
    state.file = file;
    revokeOutputs();
    elements.fileName.textContent = file.name;
    elements.imageMeta.textContent = `${image.naturalWidth.toLocaleString()} × ${image.naturalHeight.toLocaleString()} px · ${(file.size / 1048576).toFixed(1)} MB`;
    elements.dropZone.hidden = true;
    elements.editor.hidden = false;
    elements.results.hidden = true;
    drawPreview();
    elements.editor.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    elements.statusMessage.innerHTML = "<span>!</span><p>That image could not be read. Try a JPG, PNG, or WEBP file.</p>";
  };
  image.src = url;
}

function blobFromCanvas(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG export failed")), "image/png");
  });
}

function safeBaseName(name) {
  return name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "") || "photo";
}

async function splitImage() {
  elements.splitButton.disabled = true;
  elements.splitButton.firstElementChild.textContent = "Preparing full-resolution PNGs…";
  revokeOutputs();
  try {
    const { tiles } = getGrid();
    for (let index = 0; index < tiles.length; index += 1) {
      const tile = tiles[index];
      const canvas = document.createElement("canvas");
      canvas.width = tile.width;
      canvas.height = tile.height;
      canvas.getContext("2d").drawImage(
        state.sourceCanvas,
        tile.x, tile.y, tile.width, tile.height,
        0, 0, tile.width, tile.height
      );
      const blob = await blobFromCanvas(canvas);
      state.outputs.push({
        blob,
        url: URL.createObjectURL(blob),
        width: tile.width,
        height: tile.height,
        name: `${safeBaseName(state.file.name)}-${String(index + 1).padStart(2, "0")}.png`
      });
    }
    renderResults();
    elements.results.hidden = false;
    elements.results.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    elements.statusMessage.innerHTML = `<span>!</span><p>${error.message}</p>`;
  } finally {
    elements.splitButton.disabled = false;
    elements.splitButton.firstElementChild.innerHTML = `Split into <b id="splitCount">${state.rows * state.columns}</b> PNGs`;
    elements.splitCount = $("#splitCount");
  }
}

function download(output) {
  const link = document.createElement("a");
  link.href = output.url;
  link.download = output.name;
  document.body.append(link);
  link.click();
  link.remove();
}

function renderResults() {
  elements.resultGrid.replaceChildren();
  state.outputs.forEach((output, index) => {
    const figure = document.createElement("figure");
    figure.className = "result-card";
    const imageWrap = document.createElement("div");
    imageWrap.className = "result-image";
    const image = new Image();
    image.src = output.url;
    image.alt = `Split photo ${index + 1}`;
    imageWrap.append(image);
    const caption = document.createElement("figcaption");
    caption.innerHTML = `<p>Photo ${index + 1}<small>${output.width.toLocaleString()} × ${output.height.toLocaleString()} px</small></p>`;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Download";
    button.addEventListener("click", () => download(output));
    caption.append(button);
    figure.append(imageWrap, caption);
    elements.resultGrid.append(figure);
  });
}

elements.chooseButton.addEventListener("click", (event) => {
  event.stopPropagation();
  elements.fileInput.click();
});
elements.dropZone.addEventListener("click", () => elements.fileInput.click());
elements.fileInput.addEventListener("change", () => loadFile(elements.fileInput.files[0]));
elements.replaceButton.addEventListener("click", () => elements.fileInput.click());
elements.dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  elements.dropZone.classList.add("is-dragging");
});
elements.dropZone.addEventListener("dragleave", () => elements.dropZone.classList.remove("is-dragging"));
elements.dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  elements.dropZone.classList.remove("is-dragging");
  loadFile(event.dataTransfer.files[0]);
});

document.querySelectorAll("[data-target]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.target;
    state[target] = Math.max(1, Math.min(10, state[target] + Number(button.dataset.delta)));
    setCount();
    drawPreview();
    elements.results.hidden = true;
    revokeOutputs();
  });
});

elements.trimBorders.addEventListener("change", () => {
  elements.toleranceRow.classList.toggle("is-disabled", !elements.trimBorders.checked);
  drawPreview();
});
elements.tolerance.addEventListener("input", () => {
  elements.toleranceValue.value = `${elements.tolerance.value}%`;
  drawPreview();
});
elements.splitButton.addEventListener("click", splitImage);
elements.downloadAllButton.addEventListener("click", async () => {
  for (const output of state.outputs) {
    download(output);
    await new Promise((resolve) => setTimeout(resolve, 180));
  }
});
elements.startOverButton.addEventListener("click", () => {
  revokeOutputs();
  state.image = null;
  state.file = null;
  elements.fileInput.value = "";
  elements.editor.hidden = true;
  elements.results.hidden = true;
  elements.dropZone.hidden = false;
  elements.dropZone.scrollIntoView({ behavior: "smooth", block: "center" });
});

setCount();
