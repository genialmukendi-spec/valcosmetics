// ============================================================
// VAL Cosmetics — Configuration Supabase partagée
// ============================================================
const SUPABASE_URL = "https://hcfvkhjbfgaiesavfvsh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_3steKvukfX4gNbYtb-yTnA_6GTet5yP";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ------------------------------------------------------------
// Générateur d'UUID fiable (fonctionne même sur file:// où
// crypto.randomUUID() peut être indisponible car réservé aux
// contextes "sécurisés")
// ------------------------------------------------------------
function generateUUID() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    try {
      return window.crypto.randomUUID();
    } catch (e) {
      // on retombe sur le fallback ci-dessous
    }
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ------------------------------------------------------------
// Identité visiteur (pour les likes, un like par visiteur/navigateur)
// ------------------------------------------------------------
function getVisitorId() {
  let id = localStorage.getItem("val_visitor_id");
  if (!id) {
    id = "visitor_" + generateUUID();
    localStorage.setItem("val_visitor_id", id);
  }
  return id;
}

// ------------------------------------------------------------
// Réseaux sociaux de la marque — à ajuster si besoin
// ------------------------------------------------------------
const VAL_SOCIAL = {
  whatsapp: "243821593018", // numéro WhatsApp au format international, sans le +
  facebook: "https://facebook.com/valcosmetics",
  instagram: "https://www.instagram.com/val_cosmetics.bio?igsh=MXg4OHJvbGFuYzBkOQ%3D%3D&utm_source=qr",
  vcard: "val-cosmetics-contact.vcf", // fichier à enregistrer dans le répertoire du visiteur
};

// ------------------------------------------------------------
// Produits
// ------------------------------------------------------------
async function fetchPublishedProducts({ category = null, limit = 100 } = {}) {
  let query = supabaseClient
    .from("products")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (category && category !== "tous") {
    query = query.eq("category", category);
  }
  const { data, error } = await query;
  if (error) {
    console.error("Erreur chargement produits:", error);
    return [];
  }
  return data;
}

async function fetchProductById(id) {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    console.error("Erreur chargement produit:", error);
    return null;
  }
  return data;
}

// ------------------------------------------------------------
// Likes
// ------------------------------------------------------------
async function hasVisitorLiked(productId) {
  const visitorId = getVisitorId();
  const { data, error } = await supabaseClient
    .from("likes")
    .select("id")
    .eq("product_id", productId)
    .eq("visitor_id", visitorId)
    .maybeSingle();
  if (error) {
    console.error("Erreur vérification like:", error);
    return false;
  }
  return !!data;
}

async function toggleLike(productId) {
  const visitorId = getVisitorId();
  const alreadyLiked = await hasVisitorLiked(productId);

  if (alreadyLiked) {
    const { error } = await supabaseClient
      .from("likes")
      .delete()
      .eq("product_id", productId)
      .eq("visitor_id", visitorId);
    if (error) console.error("Erreur suppression like:", error);
    return false;
  } else {
    const { error } = await supabaseClient
      .from("likes")
      .insert({ product_id: productId, visitor_id: visitorId });
    if (error) console.error("Erreur ajout like:", error);
    return true;
  }
}

// ------------------------------------------------------------
// Commentaires
// ------------------------------------------------------------
async function fetchComments(productId) {
  const { data, error } = await supabaseClient
    .from("comments")
    .select("*")
    .eq("product_id", productId)
    .eq("is_approved", true)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("Erreur chargement commentaires:", error);
    return [];
  }
  return data;
}

async function postComment(productId, authorName, content) {
  const { error } = await supabaseClient
    .from("comments")
    .insert({ product_id: productId, author_name: authorName, content });
  if (error) {
    console.error("Erreur publication commentaire:", error);
    return false;
  }
  return true;
}

// ------------------------------------------------------------
// Partage réseaux sociaux
// ------------------------------------------------------------
function shareToWhatsApp(text, url) {
  const full = `${text} ${url}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(full)}`, "_blank");
}

function shareToFacebook(url) {
  window.open(
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    "_blank"
  );
}

function goToInstagram() {
  window.open(VAL_SOCIAL.instagram, "_blank");
}

function productPageUrl(productId) {
  return `${window.location.origin}${window.location.pathname.replace(
    /[^/]*$/,
    ""
  )}produits.html?produit=${productId}`;
}

// ------------------------------------------------------------
// Formatage
// ------------------------------------------------------------
function formatPrice(price) {
  if (price === null || price === undefined) return "";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(price);
}

function timeAgo(dateString) {
  const date = new Date(dateString);
  const seconds = Math.floor((new Date() - date) / 1000);
  const intervals = [
    { label: "an", secs: 31536000 },
    { label: "mois", secs: 2592000 },
    { label: "j", secs: 86400 },
    { label: "h", secs: 3600 },
    { label: "min", secs: 60 },
  ];
  for (const i of intervals) {
    const count = Math.floor(seconds / i.secs);
    if (count >= 1) return `il y a ${count} ${i.label}`;
  }
  return "à l'instant";
}
