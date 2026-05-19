// === 设备认证配置 ===
var DEVICE_REGISTRATION_KEY = "88888886";
var AUTHOR_DEVICE_KEY = "portfolio-author-device";
var AUTHOR_STORAGE_KEY = "portfolio-author";
var BASE_SITE_URL = "https://ningdesign-ai.github.io/nn-design--/";

var bodyElement = document.body;
var siteContent = document.getElementById("site-content");
var uploadSection = document.getElementById("upload");
var authorBadge = document.getElementById("author-badge");
var deauthButton = document.getElementById("deauthorize-device");

var videoFileInput = document.getElementById("video-file");
var imageFileInput = document.getElementById("image-file");
var imageTitleInput = document.getElementById("image-title");
var imageDescriptionInput = document.getElementById("image-description");
var uploadVideoButton = document.getElementById("upload-video");
var uploadImageButton = document.getElementById("upload-image");
var videoGrid = document.querySelector("#videos .grid");
var imageGrid = document.querySelector("#images .grid");

// === IndexedDB 持久化存储 ===
var DB_NAME = "portfolio-works";
var DB_VERSION = 1;
var STORE_NAME = "works";

function openDB() {
  return new Promise(function (resolve, reject) {
    var request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = function (e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = function (e) { resolve(e.target.result); };
    request.onerror = function (e) { reject(e.target.error); };
  });
}

function saveWorkToDB(work) {
  return openDB().then(function (db) {
    var tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(work);
    return new Promise(function (resolve) {
      tx.oncomplete = function () { resolve(); };
    });
  });
}

function loadAllWorksFromDB() {
  return openDB().then(function (db) {
    var tx = db.transaction(STORE_NAME, "readonly");
    var request = tx.objectStore(STORE_NAME).getAll();
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () { resolve(request.result || []); };
      request.onerror = function () { reject(request.error); };
    });
  });
}

function deleteWorkFromDB(id) {
  return openDB().then(function (db) {
    var tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    return new Promise(function (resolve) {
      tx.oncomplete = function () { resolve(); };
    });
  });
}

function updateWorkInDB(id, updates) {
  return openDB().then(function (db) {
    var tx = db.transaction(STORE_NAME, "readwrite");
    var store = tx.objectStore(STORE_NAME);
    var getReq = store.get(id);
    return new Promise(function (resolve, reject) {
      getReq.onsuccess = function () {
        var work = getReq.result;
        if (!work) return reject(new Error("Work not found"));
        Object.keys(updates).forEach(function (key) {
          work[key] = updates[key];
        });
        store.put(work);
        tx.oncomplete = function () { resolve(); };
      };
      getReq.onerror = function () { reject(getReq.error); };
    });
  });
}

function generateWorkId() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

// === 设备指纹 ===
function generateDeviceFingerprint() {
  var components = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    screen.colorDepth,
    screen.width,
    screen.height,
    navigator.hardwareConcurrency || 0,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ];
  var str = components.join("|");
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    var char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return "dev-" + Math.abs(hash).toString(36);
}

function isAuthorDevice() {
  var saved = localStorage.getItem(AUTHOR_DEVICE_KEY);
  if (!saved) return false;
  return saved === generateDeviceFingerprint();
}

function registerAuthorDevice(key) {
  if (key !== DEVICE_REGISTRATION_KEY) return false;
  localStorage.setItem(AUTHOR_DEVICE_KEY, generateDeviceFingerprint());
  localStorage.setItem(AUTHOR_STORAGE_KEY, "true");
  return true;
}

function deauthorizeDevice() {
  localStorage.removeItem(AUTHOR_DEVICE_KEY);
  localStorage.removeItem(AUTHOR_STORAGE_KEY);
  window.location.reload();
}

// === 模式切换 ===
var gIsAuthor = false;

function setAuthorMode(enabled) {
  gIsAuthor = enabled;
  if (uploadSection) {
    uploadSection.classList.toggle("hidden", !enabled);
  }
  if (authorBadge) {
    authorBadge.textContent = enabled ? "作者模式" : "读者模式";
    authorBadge.classList.remove("hidden");
  }
  if (deauthButton) {
    deauthButton.classList.toggle("hidden", !enabled);
  }
  localStorage.setItem(AUTHOR_STORAGE_KEY, enabled ? "true" : "false");
  refreshCardSettings();
}

// === URL 参数解析 ===
function getUrlAccessCode() {
  var params = new URLSearchParams(window.location.search);
  return (
    params.get("access") ||
    params.get("auth") ||
    params.get("code") ||
    ""
  ).trim();
}

// === 水印图案生成 ===
var watermarkDataUrl = null;

function getWatermarkDataUrl() {
  if (watermarkDataUrl) return watermarkDataUrl;
  var canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 120;
  var ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
  ctx.font = "15px 'Helvetica Neue', Arial, sans-serif";
  ctx.translate(100, 60);
  ctx.rotate(-22 * Math.PI / 180);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("宁宁作品集", 0, 0);
  watermarkDataUrl = canvas.toDataURL();
  return watermarkDataUrl;
}

// === 页面授权 ===
function authorizePage() {
  var hash = window.location.hash.slice(1).trim();
  var urlAccess = getUrlAccessCode();
  var registrationKey = urlAccess || hash;

  if (registrationKey === DEVICE_REGISTRATION_KEY && !isAuthorDevice()) {
    registerAuthorDevice(DEVICE_REGISTRATION_KEY);
    window.location.href = getBaseUrl();
    return;
  }

  var isAuthor = isAuthorDevice();

  setAuthorMode(isAuthor);

  if (bodyElement) {
    bodyElement.classList.add("visible");
  }

  // 先渲染持久化的作品，再初始化所有卡片
  renderPersistedWorks().then(function () {
    initAllCards();
  });
}

// === 从 IndexedDB 渲染已保存的作品 ===
function renderPersistedWorks() {
  return loadAllWorksFromDB().then(function (works) {
    if (!works.length) return;
    works.sort(function (a, b) { return b.createdAt - a.createdAt; });
    works.forEach(function (work) {
      renderWorkCard(work);
    });
  });
}

function renderWorkCard(work) {
  var url = URL.createObjectURL(work.fileData);
  var mediaHTML;
  if (work.type === "video") {
    mediaHTML = '<div class="video-preview"><video controls src="' + url + '" preload="metadata"></video></div>';
  } else {
    mediaHTML = '<img src="' + url + '" alt="' + (work.title || work.fileName) + '" />';
  }
  var card = document.createElement("article");
  card.className = "card";
  card.setAttribute("data-work-id", work.id);
  card.innerHTML =
    '<div class="card-media">' + mediaHTML + '</div>' +
    '<div class="card-body">' +
    '<h3>' + (work.title || work.fileName) + '</h3>' +
    '<p>' + (work.description || "") + '</p>' +
    '</div>';

  if (work.type === "video" && videoGrid) {
    videoGrid.appendChild(card);
  } else if (work.type === "image" && imageGrid) {
    imageGrid.appendChild(card);
  }
}

// === 灯箱 ===
function openLightbox(mediaEl) {
  var isVideo = mediaEl.tagName === "VIDEO";
  var isVideoPreview = mediaEl.closest(".video-preview") !== null;
  var videoEl = null;
  var imgEl = null;

  if (isVideo) {
    videoEl = mediaEl;
  } else if (isVideoPreview) {
    videoEl = mediaEl.closest(".video-preview").querySelector("video");
    if (!videoEl) {
      imgEl = mediaEl.closest(".video-preview").querySelector("img");
    }
  } else {
    imgEl = mediaEl;
  }

  var overlay = document.createElement("div");
  overlay.className = "lightbox-overlay";

  var closeBtn = document.createElement("button");
  closeBtn.className = "lightbox-close";
  closeBtn.innerHTML = "&#x2715;";
  closeBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    closeLightbox();
  });

  var content = document.createElement("div");
  content.className = "lightbox-content";

  if (videoEl) {
    var clonedVideo = videoEl.cloneNode(true);
    clonedVideo.controls = true;
    clonedVideo.style.maxWidth = "90vw";
    clonedVideo.style.maxHeight = "90vh";
    content.appendChild(clonedVideo);
  } else if (imgEl) {
    var clonedImg = document.createElement("img");
    clonedImg.src = imgEl.src;
    clonedImg.alt = imgEl.alt || "";
    content.appendChild(clonedImg);
  } else {
    return;
  }

  if (!gIsAuthor) {
    var watermark = document.createElement("div");
    watermark.className = "lightbox-watermark";
    watermark.style.backgroundImage = "url(" + getWatermarkDataUrl() + ")";
    content.appendChild(watermark);
  }

  overlay.appendChild(closeBtn);
  overlay.appendChild(content);

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeLightbox();
  });

  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  var overlay = document.querySelector(".lightbox-overlay");
  if (overlay) overlay.remove();
  document.body.style.overflow = "";
}

// === 设置菜单 ===
function createSettingsMenu(card) {
  var cardMedia = card.querySelector(".card-media");
  if (!cardMedia) return;

  var oldIcon = cardMedia.querySelector(".card-settings");
  if (oldIcon) oldIcon.remove();
  var oldMenu = cardMedia.querySelector(".settings-menu");
  if (oldMenu) oldMenu.remove();

  if (!gIsAuthor) return;

  var icon = document.createElement("button");
  icon.className = "card-settings";
  icon.innerHTML = "&#x2699;";
  icon.title = "设置";
  cardMedia.appendChild(icon);

  var menu = document.createElement("div");
  menu.className = "settings-menu";

  var editBtn = document.createElement("button");
  editBtn.textContent = "修改作品";
  editBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    editWork(card);
    menu.classList.remove("visible");
  });

  var coverBtn = document.createElement("button");
  coverBtn.textContent = "换封面";
  coverBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    changeCover(card);
    menu.classList.remove("visible");
  });

  var deleteBtn = document.createElement("button");
  deleteBtn.textContent = "删除作品";
  deleteBtn.className = "danger";
  deleteBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    deleteWork(card);
    menu.classList.remove("visible");
  });

  menu.appendChild(editBtn);
  menu.appendChild(coverBtn);
  menu.appendChild(deleteBtn);
  cardMedia.appendChild(menu);

  icon.addEventListener("click", function (e) {
    e.stopPropagation();
    var allMenus = document.querySelectorAll(".settings-menu.visible");
    allMenus.forEach(function (m) { m.classList.remove("visible"); });
    menu.classList.toggle("visible");
  });
}

document.addEventListener("click", function () {
  var allMenus = document.querySelectorAll(".settings-menu.visible");
  allMenus.forEach(function (m) { m.classList.remove("visible"); });
});

function refreshCardSettings() {
  var cards = document.querySelectorAll(".card");
  cards.forEach(function (card) {
    createSettingsMenu(card);
    setCardEditable(card, gIsAuthor);
  });
}

// === 删除作品 ===
function deleteWork(card) {
  if (!confirm("确定要删除这个作品吗？此操作不可撤销。")) return;
  var workId = card.getAttribute("data-work-id");
  card.remove();
  if (workId) {
    deleteWorkFromDB(workId).catch(function () {});
  }
}

// === 卡片文字可编辑 ===
function setCardEditable(card, enabled) {
  var title = card.querySelector(".card-body h3");
  var desc = card.querySelector(".card-body p");
  if (title) title.contentEditable = enabled ? "true" : "false";
  if (desc) desc.contentEditable = enabled ? "true" : "false";
}

function editWork(card) {
  var title = card.querySelector(".card-body h3");
  if (title) {
    title.classList.add("editing");
    title.focus();
    title.addEventListener("blur", function () {
      title.classList.remove("editing");
    }, { once: true });
  }
}

// === 换封面 ===
function changeCover(card) {
  var cardMedia = card.querySelector(".card-media");
  if (!cardMedia) return;

  var isVideo = cardMedia.querySelector(".video-preview") !== null;

  var input = document.createElement("input");
  input.type = "file";
  input.accept = isVideo ? "video/*" : "image/*";

  input.addEventListener("change", function () {
    if (!input.files || !input.files.length) return;
    var file = input.files[0];
    var url = URL.createObjectURL(file);

    if (isVideo) {
      var videoEl = cardMedia.querySelector("video");
      if (videoEl) {
        videoEl.src = url;
      }
    } else {
      var imgEl = cardMedia.querySelector("img");
      if (imgEl) {
        imgEl.src = url;
      }
    }

    // 更新 IndexedDB 中的文件数据
    var workId = card.getAttribute("data-work-id");
    if (workId) {
      updateWorkInDB(workId, { fileData: file, fileName: file.name }).catch(function () {});
    }

    bindCardLightbox(card);
  });

  input.click();
}

// === 编辑内容持久化 ===
function persistCardEdit(card) {
  var workId = card.getAttribute("data-work-id");
  if (!workId) return;
  var title = card.querySelector(".card-body h3");
  var desc = card.querySelector(".card-body p");
  updateWorkInDB(workId, {
    title: title ? title.textContent : "",
    description: desc ? desc.textContent : ""
  }).catch(function () {});
}

// === 灯箱绑定 ===
function bindCardLightbox(card) {
  var cardMedia = card.querySelector(".card-media");
  if (!cardMedia) return;

  var newMedia = cardMedia.cloneNode(true);
  cardMedia.parentNode.replaceChild(newMedia, cardMedia);

  createSettingsMenu(card);

  newMedia.addEventListener("click", function (e) {
    if (e.target.closest(".card-settings") || e.target.closest(".settings-menu")) {
      return;
    }
    var media = newMedia.querySelector("video") || newMedia.querySelector("img");
    if (media) openLightbox(media);
  });
}

// === 初始化所有卡片 ===
function initAllCards() {
  var cards = document.querySelectorAll(".card");
  cards.forEach(function (card) {
    ensureCardMedia(card);
    createSettingsMenu(card);
    setCardEditable(card, gIsAuthor);
    bindCardLightbox(card);
  });
}

function ensureCardMedia(card) {
  if (card.querySelector(".card-media")) return;

  var media = card.querySelector(".video-preview") || card.querySelector("img");
  if (!media) return;

  var wrapper = document.createElement("div");
  wrapper.className = "card-media";

  while (card.firstElementChild && !card.firstElementChild.classList.contains("card-body")) {
    wrapper.appendChild(card.firstElementChild);
  }
  card.insertBefore(wrapper, card.firstElementChild);
}

// === 作品上传（持久化到 IndexedDB） ===
function addVideoWork(file) {
  if (!videoGrid) return;
  var workId = generateWorkId();
  var url = URL.createObjectURL(file);
  var mediaHTML = '<div class="video-preview"><video controls src="' + url + '" preload="metadata"></video></div>';
  var card = document.createElement("article");
  card.className = "card";
  card.setAttribute("data-work-id", workId);
  card.innerHTML =
    '<div class="card-media">' + mediaHTML + '</div>' +
    '<div class="card-body">' +
    '<h3>' + file.name + '</h3>' +
    '<p>已上传的视频作品。</p>' +
    '</div>';
  videoGrid.prepend(card);
  initSingleCard(card);

  saveWorkToDB({
    id: workId,
    type: "video",
    fileName: file.name,
    fileData: file,
    title: file.name,
    description: "已上传的视频作品。",
    createdAt: Date.now()
  }).catch(function () {});
}

function addImageWork(file, title, description) {
  if (!imageGrid) return;
  var workId = generateWorkId();
  var url = URL.createObjectURL(file);
  var mediaHTML = '<img src="' + url + '" alt="' + (title || file.name) + '" />';
  var card = document.createElement("article");
  card.className = "card";
  card.setAttribute("data-work-id", workId);
  card.innerHTML =
    '<div class="card-media">' + mediaHTML + '</div>' +
    '<div class="card-body">' +
    '<h3>' + (title || file.name) + '</h3>' +
    '<p>' + (description || "已上传的图文作品。") + '</p>' +
    '</div>';
  imageGrid.prepend(card);
  initSingleCard(card);

  saveWorkToDB({
    id: workId,
    type: "image",
    fileName: file.name,
    fileData: file,
    title: title || file.name,
    description: description || "已上传的图文作品。",
    createdAt: Date.now()
  }).catch(function () {});
}

function initSingleCard(card) {
  createSettingsMenu(card);
  setCardEditable(card, gIsAuthor);
  bindCardLightbox(card);
}

function uploadVideo() {
  if (!videoFileInput || !videoFileInput.files.length) {
    window.alert("请选择一个视频文件后再上传。");
    return;
  }
  addVideoWork(videoFileInput.files[0]);
  videoFileInput.value = "";
}

function uploadImage() {
  if (!imageFileInput || !imageFileInput.files.length) {
    window.alert("请选择一张图片后再上传。");
    return;
  }
  addImageWork(imageFileInput.files[0], imageTitleInput.value.trim(), imageDescriptionInput.value.trim());
  imageFileInput.value = "";
  imageTitleInput.value = "";
  imageDescriptionInput.value = "";
}

function getBaseUrl() {
  if (BASE_SITE_URL) {
    return BASE_SITE_URL.replace(/\/index\.html$|\/$/, "/index.html");
  }
  if (window.location.protocol.startsWith("http")) {
    return window.location.origin + window.location.pathname;
  }
  return window.location.href.split("?")[0].split("#")[0];
}

// === 事件绑定 ===
if (deauthButton) deauthButton.addEventListener("click", deauthorizeDevice);
if (uploadVideoButton) uploadVideoButton.addEventListener("click", uploadVideo);
if (uploadImageButton) uploadImageButton.addEventListener("click", uploadImage);

document.addEventListener("focusin", function (e) {
  if (e.target.closest(".card-body") && e.target.isContentEditable) {
    e.target.classList.add("editing");
  }
});

document.addEventListener("focusout", function (e) {
  if (e.target.closest(".card-body") && e.target.isContentEditable) {
    e.target.classList.remove("editing");
    // 持久化编辑内容到 IndexedDB
    var card = e.target.closest(".card");
    if (card) persistCardEdit(card);
  }
});

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") closeLightbox();
});

window.addEventListener("load", authorizePage);
window.addEventListener("hashchange", authorizePage);
