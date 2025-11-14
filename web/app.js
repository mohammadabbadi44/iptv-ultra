const storageKey = "ultra-iptv-favorites";

const elements = {
  list: document.getElementById("channelList"),
  resultCount: document.getElementById("resultCount"),
  filters: document.getElementById("filtersCard"),
  urlInput: document.getElementById("playlistUrl"),
  loadUrlBtn: document.getElementById("loadUrlBtn"),
  fileInput: document.getElementById("playlistFile"),
  searchInput: document.getElementById("searchInput"),
  groupSelect: document.getElementById("groupSelect"),
  sortSelect: document.getElementById("sortSelect"),
  favoritesOnly: document.getElementById("favoritesOnly"),
  clearBtn: document.getElementById("clearPlaylist"),
  player: document.getElementById("videoPlayer"),
  nowTitle: document.getElementById("currentTitle"),
  nowMeta: document.getElementById("currentMeta"),
  nowTags: document.getElementById("currentTags"),
  status: document.getElementById("statusBar"),
  template: document.getElementById("channelTemplate"),
};

const state = {
  channels: [],
  filtered: [],
  groups: [],
  favorites: loadFavorites(),
  selected: null,
  hls: null,
};

document.querySelectorAll("[data-sample]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const samplePath = btn.getAttribute("data-sample");
    if (!samplePath) {
      return;
    }
    loadFromUrl(samplePath);
  });
});

elements.loadUrlBtn?.addEventListener("click", () => {
  if (!elements.urlInput) {
    return;
  }
  loadFromUrl(elements.urlInput.value.trim());
});

elements.urlInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    loadFromUrl(elements.urlInput.value.trim());
  }
});

elements.fileInput?.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) {
    loadFromFile(file);
    event.target.value = "";
  }
});

elements.searchInput?.addEventListener("input", debounce(applyFilters, 200));
elements.groupSelect?.addEventListener("change", applyFilters);
elements.sortSelect?.addEventListener("change", applyFilters);
elements.favoritesOnly?.addEventListener("change", applyFilters);

elements.clearBtn?.addEventListener("click", () => {
  state.channels = [];
  state.filtered = [];
  elements.list.innerHTML = "";
  toggleFilters(false);
  updateResultCount();
  setStatus("تم مسح القائمة الحالية.", "idle");
  stopPlayback();
});

function loadFavorites() {
  try {
    const stored = localStorage.getItem(storageKey);
    return new Set(stored ? JSON.parse(stored) : []);
  } catch (error) {
    console.error("Cannot load favorites", error);
    return new Set();
  }
}

function persistFavorites() {
  try {
    localStorage.setItem(storageKey, JSON.stringify([...state.favorites]));
  } catch (error) {
    console.error("Cannot save favorites", error);
  }
}

function loadFromUrl(url) {
  if (!url) {
    setStatus("الرجاء إدخال رابط صالح.", "error");
    return;
  }

  setStatus("جارٍ تحميل القائمة...", "loading");

  fetch(url, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`تعذر تحميل القائمة (HTTP ${response.status})`);
      }
      return response.text();
    })
    .then(handlePlaylistText)
    .catch((error) => {
      console.error(error);
      setStatus("حدث خطأ أثناء تحميل القائمة. تحقق من الرابط أو الصلاحيات.", "error");
    });
}

function loadFromFile(file) {
  setStatus(`جارٍ قراءة ${file.name}...`, "loading");

  const reader = new FileReader();
  reader.onload = (event) => {
    handlePlaylistText(event.target?.result ?? "");
  };
  reader.onerror = () => {
    setStatus("تعذر قراءة الملف، حاول مرة أخرى.", "error");
  };
  reader.readAsText(file);
}

function handlePlaylistText(text) {
  const channels = parseM3U(text);

  if (!channels.length) {
    setStatus("لم يتم العثور على قنوات في القائمة.", "error");
    return;
  }

  state.channels = channels;
  buildGroupFilter();
  applyFilters();
  toggleFilters(true);
  setStatus(`تم تحميل ${channels.length} قناة. استمتع!`, "idle");
  elements.clearBtn?.removeAttribute("hidden");
}

function parseM3U(text) {
  const lines = text.split(/\r?\n/);
  const entries = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("#EXTINF")) {
      const payload = line.slice("#EXTINF:".length);
      const commaIndex = payload.indexOf(",");
      const metaPart = commaIndex === -1 ? payload : payload.slice(0, commaIndex);
      const namePart = commaIndex === -1 ? "قناة بدون اسم" : payload.slice(commaIndex + 1).trim();
      const attributes = {};

      metaPart.replace(/([a-zA-Z0-9-]+)="([^"]*)"/g, (_, key, value) => {
        attributes[key.toLowerCase()] = value;
        return "";
      });

      const duration = Number.parseInt(metaPart, 10);

      current = {
        name: namePart || "قناة غير معروفة",
        url: "",
        duration: Number.isNaN(duration) ? -1 : duration,
        group: attributes["group-title"] || "عام",
        logo: attributes["tvg-logo"] || "",
        country: attributes["tvg-country"] || "",
        language: attributes["tvg-language"] || "",
        id: attributes["tvg-id"] || `${Date.now()}-${Math.random()}`,
        raw: attributes,
      };
    } else if (line.startsWith("#")) {
      continue;
    } else if (current) {
      current.url = line;
      entries.push(current);
      current = null;
    }
  }

  return entries;
}

function buildGroupFilter() {
  if (!elements.groupSelect) return;

  const groups = [...new Set(state.channels.map((channel) => channel.group).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "ar", { sensitivity: "base" }),
  );
  state.groups = groups;
  const fragment = document.createDocumentFragment();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "كل المجموعات";
  fragment.appendChild(placeholder);

  groups.forEach((group) => {
    const option = document.createElement("option");
    option.value = group;
    option.textContent = group;
    fragment.appendChild(option);
  });

  elements.groupSelect.innerHTML = "";
  elements.groupSelect.appendChild(fragment);
}

function applyFilters() {
  const query = elements.searchInput?.value.trim().toLowerCase() ?? "";
  const selectedGroup = elements.groupSelect?.value ?? "";
  const sortBy = elements.sortSelect?.value ?? "name";
  const onlyFavorites = Boolean(elements.favoritesOnly?.checked);

  let result = [...state.channels];

  if (selectedGroup) {
    result = result.filter((channel) => channel.group === selectedGroup);
  }

  if (onlyFavorites) {
    result = result.filter((channel) => state.favorites.has(makeChannelKey(channel)));
  }

  if (query) {
    result = result.filter((channel) => {
      const haystack = [
        channel.name,
        channel.group,
        channel.country,
        channel.language,
        channel.raw?.["tvg-name"],
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }

  result.sort((a, b) => sortChannels(a, b, sortBy));

  state.filtered = result;
  renderList();
  updateResultCount();
}

function sortChannels(a, b, sortBy) {
  if (sortBy === "country") {
    return (a.country || "").localeCompare(b.country || "", "en", { sensitivity: "base" });
  }

  if (sortBy === "quality") {
    return qualityScore(b) - qualityScore(a);
  }

  return a.name.localeCompare(b.name, "ar", { sensitivity: "base" });
}

function qualityScore(channel) {
  const reference = `${channel.name} ${channel.raw?.["resolution"] ?? ""}`.toLowerCase();
  if (reference.includes("4k") || reference.includes("2160")) return 4;
  if (reference.includes("1080")) return 3;
  if (reference.includes("720")) return 2;
  if (reference.includes("sd") || reference.includes("480")) return 1;
  return 0;
}

function renderList() {
  if (!elements.list || !elements.template) return;

  elements.list.innerHTML = "";

  if (!state.filtered.length) {
    const empty = document.createElement("li");
    empty.className = "muted";
    empty.textContent = "لا توجد قنوات مطابقة للمعايير الحالية.";
    elements.list.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  state.filtered.forEach((channel) => {
    const clone = elements.template.content.cloneNode(true);
    const card = clone.querySelector(".channel-card");
    const title = clone.querySelector("h4");
    const meta = clone.querySelector(".meta");
    const quality = clone.querySelector(".quality");
    const avatar = clone.querySelector(".avatar");
    const favButton = clone.querySelector(".fav-btn");
    const tagsWrap = clone.querySelector(".tag-row");

    if (!card || !title || !meta || !avatar || !favButton || !tagsWrap) return;

    card.dataset.key = makeChannelKey(channel);
    title.textContent = channel.name;
    meta.textContent = buildMeta(channel);
    quality.textContent = formatQuality(qualityScore(channel));
    avatar.textContent = makeInitials(channel.name);

    if (channel.logo) {
      avatar.style.backgroundImage = `url(${channel.logo})`;
      avatar.textContent = "";
    } else {
      avatar.style.backgroundImage = "";
    }

    buildTags(channel).forEach((tag) => tagsWrap.appendChild(tag));

    const isFavorite = state.favorites.has(card.dataset.key);
    favButton.setAttribute("aria-pressed", String(isFavorite));

    favButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleFavorite(channel, favButton);
    });

    card.addEventListener("click", () => selectChannel(channel, card));
    card.addEventListener("dblclick", () => window.open(channel.url, "_blank", "noopener"));

    fragment.appendChild(clone);
  });

  elements.list.appendChild(fragment);
}

function buildMeta(channel) {
  const parts = [];
  if (channel.country) parts.push(channel.country.toUpperCase());
  if (channel.language) parts.push(channel.language);
  if (channel.group) parts.push(channel.group);
  return parts.join(" · ");
}

function formatQuality(score) {
  if (score === 4) return "4K";
  if (score === 3) return "Full HD";
  if (score === 2) return "HD";
  if (score === 1) return "SD";
  return "";
}

function buildTags(channel) {
  const tags = [];
  const info = [
    channel.group,
    channel.language && `🔊 ${channel.language}`,
    channel.country && `🌍 ${channel.country.toUpperCase()}`,
  ].filter(Boolean);

  info.forEach((value) => {
    const span = document.createElement("span");
    span.className = "tag";
    span.textContent = value;
    tags.push(span);
  });

  return tags;
}

function selectChannel(channel, card) {
  state.selected = channel;
  document.querySelectorAll(".channel-card.active").forEach((active) => {
    active.classList.remove("active");
  });
  card?.classList.add("active");
  updateNowPlaying(channel);
  startPlayback(channel);
  setStatus(`يتم تشغيل ${channel.name}`, "idle");
}

function makeInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((segment) => segment.charAt(0))
    .join("")
    .toUpperCase();
}

function makeChannelKey(channel) {
  return `${channel.name}|${channel.url}`;
}

function toggleFavorite(channel, button) {
  const key = makeChannelKey(channel);
  if (state.favorites.has(key)) {
    state.favorites.delete(key);
    button?.setAttribute("aria-pressed", "false");
  } else {
    state.favorites.add(key);
    button?.setAttribute("aria-pressed", "true");
  }

  persistFavorites();
  if (elements.favoritesOnly?.checked) {
    applyFilters();
  }
}

function updateResultCount() {
  if (!elements.resultCount) return;

  if (!state.channels.length) {
    elements.resultCount.textContent = "لم يتم تحميل قائمة بعد";
    return;
  }

  elements.resultCount.textContent = `${state.filtered.length} من ${state.channels.length} قناة`;
}

function toggleFilters(show) {
  if (!elements.filters) return;
  elements.filters.classList.toggle("hidden", !show);
}

function updateNowPlaying(channel) {
  if (!channel) return;

  elements.nowTitle.textContent = channel.name;
  elements.nowMeta.textContent = buildMeta(channel) || "قناة بدون بيانات وصفية";
  elements.nowTags.innerHTML = "";
  buildTags(channel).forEach((tag) => elements.nowTags.appendChild(tag));
}

function startPlayback(channel) {
  if (!channel || !elements.player) return;

  const source = channel.url;

  if (state.hls) {
    state.hls.destroy();
    state.hls = null;
  }

  if (window.Hls?.isSupported() && source.endsWith(".m3u8")) {
    state.hls = new window.Hls();
    state.hls.loadSource(source);
    state.hls.attachMedia(elements.player);
  } else {
    elements.player.src = source;
  }

  elements.player.play().catch(() => {
    setStatus("تم تحميل القناة لكن التشغيل التلقائي موقوف من المتصفح.", "error");
  });
}

function stopPlayback() {
  if (state.hls) {
    state.hls.destroy();
    state.hls = null;
  }
  if (elements.player) {
    elements.player.pause();
    elements.player.removeAttribute("src");
    elements.player.load();
  }
  elements.nowTitle.textContent = "لم يتم اختيار قناة";
  elements.nowMeta.textContent = "قم بتحميل قائمة M3U من أجل البدء.";
  elements.nowTags.innerHTML = "";
}

function setStatus(message, type = "idle") {
  if (!elements.status) return;
  elements.status.textContent = message;
  if (type === "idle") {
    delete elements.status.dataset.state;
  } else {
    elements.status.dataset.state = type;
  }
}

function debounce(fn, delay = 200) {
  let timer;
  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
