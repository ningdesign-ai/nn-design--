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
var projectTitleInput = document.getElementById("project-title");
var projectBriefInput = document.getElementById("project-brief");
var projectImagesInput = document.getElementById("project-images");
var projectTimelineInput = document.getElementById("project-timeline");
var projectContentInput = document.getElementById("project-content");
var projectResultsInput = document.getElementById("project-results");
var uploadVideoButton = document.getElementById("upload-video");
var uploadProjectButton = document.getElementById("upload-project");
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

// === 硬编码项目数据（方案 A：提交到仓库） ===
var hardcodedProjects = {
  "proj-hardcoded-1": {
    id: "proj-hardcoded-1",
    title: "作品集图片",
    brief: "品牌视觉展示图，简洁构图与明快色彩的组合。",
    images: [{ url: "作品集图片.png", fileName: "作品集图片.png" }],
    timeline: "2025年",
    content: "品牌视觉设计项目，包含主视觉图和辅助图形。",
    results: "提升了品牌视觉的一致性和辨识度。"
  },
  "proj-hardcoded-2": {
    id: "proj-hardcoded-2",
    title: "长图内容",
    brief: "图文内容版式设计，适合社交媒体与展示页呈现。",
    images: [{ url: "https://via.placeholder.com/640x480?text=图文作品", fileName: "图文作品" }],
    timeline: "2025年",
    content: "社交媒体长图内容排版设计。",
    results: "提高了内容的阅读率和互动率。"
  }
};

// 内存缓存：合并硬编码 + IndexedDB
var allProjects = {};

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
  // 先加载硬编码项目
  Object.keys(hardcodedProjects).forEach(function (id) {
    allProjects[id] = hardcodedProjects[id];
  });

  return loadAllWorksFromDB().then(function (works) {
    if (!works.length) return;
    works.sort(function (a, b) { return b.createdAt - a.createdAt; });
    works.forEach(function (work) {
      if (work.type === "image-project") {
        // 将 IndexedDB 中的 Blob 转为 blob URL
        work.images = (work.images || []).map(function (img) {
          return {
            url: img.fileData ? URL.createObjectURL(img.fileData) : img.url,
            fileName: img.fileName
          };
        });
        if (work.coverFileData) {
          work.coverUrl = URL.createObjectURL(work.coverFileData);
        }
        allProjects[work.id] = work;
        renderProjectCard(work);
      } else {
        renderWorkCard(work);
      }
    });
  });
}

function renderProjectCard(project) {
  var coverUrl = project.coverUrl;
  if (!coverUrl && project.images && project.images.length) {
    coverUrl = project.images[0].url;
  }
  if (!coverUrl) return;
  var card = document.createElement("article");
  card.className = "card project-card";
  card.setAttribute("data-project-id", project.id);
  card.innerHTML =
    '<div class="card-media">' +
    '<img src="' + coverUrl + '" alt="' + (project.title || "") + '" />' +
    '</div>' +
    '<div class="card-body">' +
    '<h3>' + (project.title || "") + '</h3>' +
    '<p>' + (project.brief || "") + '</p>' +
    '</div>';
  if (imageGrid) imageGrid.appendChild(card);
}

function renderWorkCard(work) {
  var url = URL.createObjectURL(work.fileData);
  var mediaHTML;
  if (work.type === "video") {
    mediaHTML = '<div class="video-preview"><video src="' + url + '" preload="metadata" muted></video></div>';
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

// === 项目详情面板 ===
function openProjectDetail(projectId) {
  var project = allProjects[projectId];
  if (!project) return;

  var overlay = document.createElement("div");
  overlay.className = "project-detail-overlay";

  var panel = document.createElement("div");
  panel.className = "project-detail-panel";

  // 关闭按钮
  var closeBtn = document.createElement("button");
  closeBtn.className = "project-detail-close";
  closeBtn.innerHTML = "&#x2715;";
  closeBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    closeProjectDetail();
  });

  // 左侧图片区
  var imagesDiv = document.createElement("div");
  imagesDiv.className = "project-detail-images";
  (project.images || []).forEach(function (img) {
    var imgEl = document.createElement("img");
    imgEl.src = img.url;
    imgEl.alt = project.title;
    imagesDiv.appendChild(imgEl);
  });

  // 右侧信息区
  var infoDiv = document.createElement("div");
  infoDiv.className = "project-detail-info";
  infoDiv.innerHTML =
    '<h2>' + (project.title || "") + '</h2>' +
    '<p class="project-brief">' + (project.brief || "") + '</p>' +
    '<div class="info-block">' +
    '<h4>项目时间</h4>' +
    '<p>' + (project.timeline || "未填写") + '</p>' +
    '</div>' +
    '<div class="info-block">' +
    '<h4>项目内容</h4>' +
    '<p>' + (project.content || "未填写") + '</p>' +
    '</div>' +
    '<div class="info-block">' +
    '<h4>项目结果</h4>' +
    '<p>' + (project.results || "未填写") + '</p>' +
    '</div>';

  panel.appendChild(closeBtn);
  panel.appendChild(imagesDiv);
  panel.appendChild(infoDiv);
  overlay.appendChild(panel);

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeProjectDetail();
  });

  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";
}

function closeProjectDetail() {
  var overlay = document.querySelector(".project-detail-overlay");
  if (overlay) overlay.remove();
  document.body.style.overflow = "";
}

function getProjectData(projectId) {
  if (allProjects[projectId]) return Promise.resolve(allProjects[projectId]);
  // 兜底：从 IndexedDB 加载
  return openDB().then(function (db) {
    var tx = db.transaction(STORE_NAME, "readonly");
    var req = tx.objectStore(STORE_NAME).get(projectId);
    return new Promise(function (resolve, reject) {
      req.onsuccess = function () {
        var data = req.result;
        if (data) allProjects[projectId] = data;
        resolve(data || null);
      };
      req.onerror = function () { resolve(null); };
    });
  });
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
  var workId = card.getAttribute("data-work-id") || card.getAttribute("data-project-id");
  var projectId = card.getAttribute("data-project-id");
  card.remove();
  if (workId) {
    deleteWorkFromDB(workId).catch(function () {});
  }
  if (projectId) {
    delete allProjects[projectId];
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
    var projectId = card.getAttribute("data-project-id");
    if (projectId && allProjects[projectId]) {
      allProjects[projectId].coverFileData = file;
      allProjects[projectId].images[0] = { url: url, fileName: file.name };
      updateWorkInDB(projectId, { coverFileData: file }).catch(function () {});
    }

    bindCardClick(card);
  });

  input.click();
}

// === 编辑内容持久化 ===
function persistCardEdit(card) {
  var title = card.querySelector(".card-body h3");
  var desc = card.querySelector(".card-body p");
  var titleText = title ? title.textContent : "";
  var descText = desc ? desc.textContent : "";

  var workId = card.getAttribute("data-work-id");
  if (workId) {
    updateWorkInDB(workId, {
      title: titleText,
      description: descText
    }).catch(function () {});
  }

  var projectId = card.getAttribute("data-project-id");
  if (projectId && allProjects[projectId]) {
    allProjects[projectId].title = titleText;
    allProjects[projectId].brief = descText;
    updateWorkInDB(projectId, {
      title: titleText,
      brief: descText
    }).catch(function () {});
  }
}

// === 卡片点击绑定 ===
function bindCardClick(card) {
  var cardMedia = card.querySelector(".card-media");
  if (!cardMedia) return;

  var newMedia = cardMedia.cloneNode(true);
  cardMedia.parentNode.replaceChild(newMedia, cardMedia);

  createSettingsMenu(card);

  var isProject = card.classList.contains("project-card");
  var projectId = card.getAttribute("data-project-id");

  newMedia.addEventListener("click", function (e) {
    if (e.target.closest(".card-settings") || e.target.closest(".settings-menu")) {
      return;
    }
    if (isProject && projectId) {
      getProjectData(projectId).then(function (data) {
        if (data) openProjectDetail(projectId);
      });
    } else {
      var media = newMedia.querySelector("video") || newMedia.querySelector("img");
      if (media) openLightbox(media);
    }
  });
}

// === 初始化所有卡片 ===
function initAllCards() {
  var cards = document.querySelectorAll(".card");
  cards.forEach(function (card) {
    ensureCardMedia(card);
    createSettingsMenu(card);
    setCardEditable(card, gIsAuthor);
    bindCardClick(card);
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
  var mediaHTML = '<div class="video-preview"><video src="' + url + '" preload="metadata" muted></video></div>';
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

function initSingleCard(card) {
  createSettingsMenu(card);
  setCardEditable(card, gIsAuthor);
  bindCardClick(card);
}

function uploadVideo() {
  if (!videoFileInput || !videoFileInput.files.length) {
    window.alert("请选择一个视频文件后再上传。");
    return;
  }
  addVideoWork(videoFileInput.files[0]);
  videoFileInput.value = "";
}

// === 图文项目上传 ===
function uploadProject() {
  if (!projectImagesInput || !projectImagesInput.files.length) {
    window.alert("请至少选择一张图片。");
    return;
  }
  var title = projectTitleInput.value.trim() || "未命名项目";
  var brief = projectBriefInput.value.trim();
  var timeline = projectTimelineInput.value.trim();
  var content = projectContentInput.value.trim();
  var results = projectResultsInput.value.trim();

  var files = Array.from(projectImagesInput.files);
  var projectId = generateWorkId();
  var images = [];
  var coverFileData = files[0];

  files.forEach(function (file) {
    images.push({ url: URL.createObjectURL(file), fileName: file.name });
  });

  var project = {
    id: projectId,
    type: "image-project",
    title: title,
    brief: brief,
    images: images,
    timeline: timeline,
    content: content,
    results: results,
    coverFileData: coverFileData,
    createdAt: Date.now()
  };

  allProjects[projectId] = project;
  renderProjectCard(project);
  initSingleCard(imageGrid.querySelector('.project-card[data-project-id="' + projectId + '"]'));

  var dbProject = {
    id: projectId,
    type: "image-project",
    title: title,
    brief: brief,
    images: files.map(function (f) { return { fileName: f.name, fileData: f }; }),
    timeline: timeline,
    content: content,
    results: results,
    coverFileData: coverFileData,
    createdAt: Date.now()
  };
  saveWorkToDB(dbProject).catch(function () {});

  projectTitleInput.value = "";
  projectBriefInput.value = "";
  projectImagesInput.value = "";
  projectTimelineInput.value = "";
  projectContentInput.value = "";
  projectResultsInput.value = "";
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
if (uploadProjectButton) uploadProjectButton.addEventListener("click", uploadProject);

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
  if (e.key === "Escape") {
    closeLightbox();
    closeProjectDetail();
  }
});

window.addEventListener("load", authorizePage);
window.addEventListener("hashchange", authorizePage);
