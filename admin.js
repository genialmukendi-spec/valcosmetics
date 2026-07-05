// ============================================================
// VAL Cosmetics — Fonctions réservées au back-office admin
// (nécessite supabase-client.js chargé avant ce fichier)
// ============================================================

async function adminSignIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { ok: false, message: error.message };
  const admin = await isCurrentUserAdmin();
  if (!admin) {
    await supabaseClient.auth.signOut();
    return {
      ok: false,
      message: "Ce compte n'a pas les droits administrateur.",
    };
  }
  return { ok: true, user: data.user };
}

async function adminSignOut() {
  await supabaseClient.auth.signOut();
}

async function getCurrentUser() {
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  return user;
}

async function isCurrentUserAdmin() {
  const user = await getCurrentUser();
  if (!user) return false;
  const { data, error } = await supabaseClient
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    console.error("Erreur vérification admin:", error);
    return false;
  }
  return !!data;
}

// ------------------------------------------------------------
// Upload d'image produit vers le bucket "product-images"
// ------------------------------------------------------------
async function uploadProductImage(file) {
  try {
    const ext = file.name.split(".").pop();
    const path = `products/${generateUUID()}.${ext}`;
    const { error } = await supabaseClient.storage
      .from("product-images")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) {
      console.error("Erreur upload image:", error);
      return null;
    }
    const {
      data: { publicUrl },
    } = supabaseClient.storage.from("product-images").getPublicUrl(path);
    return publicUrl;
  } catch (e) {
    console.error("Exception upload image:", e);
    return null;
  }
}

// ------------------------------------------------------------
// CRUD produits (admin uniquement, RLS protège côté serveur)
// ------------------------------------------------------------
async function createProduct({ title, description, price, category, imageUrl }) {
  const user = await getCurrentUser();
  const { data, error } = await supabaseClient
    .from("products")
    .insert({
      title,
      description,
      price,
      category,
      image_url: imageUrl,
      created_by: user ? user.id : null,
    })
    .select()
    .single();
  if (error) {
    console.error("Erreur création produit:", error);
    return { ok: false, message: error.message };
  }
  return { ok: true, product: data };
}

async function fetchAllProductsAdmin() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Erreur chargement produits admin:", error);
    return [];
  }
  return data;
}

async function deleteProduct(productId) {
  const { error } = await supabaseClient
    .from("products")
    .delete()
    .eq("id", productId);
  if (error) {
    console.error("Erreur suppression produit:", error);
    return false;
  }
  return true;
}

async function toggleProductPublished(productId, isPublished) {
  const { error } = await supabaseClient
    .from("products")
    .update({ is_published: isPublished })
    .eq("id", productId);
  if (error) {
    console.error("Erreur mise à jour publication:", error);
    return false;
  }
  return true;
}

// ------------------------------------------------------------
// Modération des commentaires
// ------------------------------------------------------------
async function fetchAllCommentsAdmin() {
  const { data, error } = await supabaseClient
    .from("comments")
    .select("*, products(title)")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Erreur chargement commentaires admin:", error);
    return [];
  }
  return data;
}

async function deleteCommentAdmin(commentId) {
  const { error } = await supabaseClient
    .from("comments")
    .delete()
    .eq("id", commentId);
  if (error) {
    console.error("Erreur suppression commentaire:", error);
    return false;
  }
  return true;
}
