// ==== CONFIGURE ICI ====================================================
const SHOPIFY_STORE = "hw2b3t-as"; // exemple : "hw2b3t-as" (juste la partie avant .myshopify.com)
const SHOPIFY_API_VERSION = "2025-10"; // adapte si tu veux une autre version
const SHOPIFY_URL = `https://${SHOPIFY_STORE}.myshopify.com/api/${SHOPIFY_API_VERSION}/graphql.json`;
const SHOPIFY_TOKEN = "3acb7bcfd99fea10a2171362e7dd585b"; // remplace par TON Storefront Access Token
// =======================================================================

// UTIL: logs plus lisibles
const debug = (...args) => console.log("[SHOPIFY-HEADLESS]", ...args);

// Persistance du cartId
const CART_KEY = "shopify_cart_id_headless_v1";

let cartId = localStorage.getItem(CART_KEY) || null;

// ---------- helper fetch qui loggue la réponse ----------
async function shopifyFetch(bodyObj) {
    try {
    const resp = await fetch(SHOPIFY_URL, {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": SHOPIFY_TOKEN
        },
        body: JSON.stringify(bodyObj)
    });
    const json = await resp.json();
    debug("FULL RESPONSE:", json);
    return json;
    } catch (err) {
    console.error("Network or fetch error:", err);
    throw err;
    }
}

// ---------- create cart ----------
async function createCart() {
    const query = `
    mutation {
        cartCreate {
        cart { id }
        userErrors { field message }
        }
    }
    `;
    const json = await shopifyFetch({ query });
    if (json.errors) {
    console.error("GraphQL errors:", json.errors);
    throw new Error("GraphQL errors (see console).");
    }
    const payload = json.data && json.data.cartCreate;
    if (!payload) {
    console.error("No cartCreate in response:", json);
    throw new Error("cartCreate missing in response.");
    }
    if (payload.userErrors && payload.userErrors.length) {
    console.error("cartCreate userErrors:", payload.userErrors);
    throw new Error("cartCreate returned userErrors (see console).");
    }
    cartId = payload.cart.id;
    localStorage.setItem(CART_KEY, cartId);
    debug("Created cartId:", cartId);
    return cartId;
}

// ---------- add to cart ----------
async function addToCart(variantId, quantity = 1) {
    if (!variantId) {
    alert("Variant ID manquant — vérifie le data-variant-id du bouton.");
    return;
    }

    if (!cartId) {
    await createCart();
    }

    const query = `
    mutation cartAdd($cartId: ID!, $lines: [CartLineInput!]!) {
        cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart {
            id
            lines(first: 100) {
            edges {
                node {
                id
                quantity
                merchandise {
                    ... on ProductVariant {
                    id
                    title
                    product { title }
                    }
                }
                }
            }
            }
        }
        userErrors { field message }
        }
    }
    `;
    const variables = {
    cartId,
    lines: [{ merchandiseId: variantId, quantity }]
    };

    const json = await shopifyFetch({ query, variables });

    if (json.errors) {
    console.error("GraphQL errors:", json.errors);
    alert("Erreur GraphQL — voir la console.");
    return;
    }

    const result = json.data && json.data.cartLinesAdd;
    if (!result) {
    console.error("cartLinesAdd absent:", json);
    alert("Erreur API — voir console.");
    return;
    }

    if (result.userErrors && result.userErrors.length) {
    console.error("cartLinesAdd userErrors:", result.userErrors);
    alert("Impossible d'ajouter au panier : " + result.userErrors.map(e => e.message).join(", "));
    return;
    }

    // RENDER
    renderCartFromCartObject(result.cart);
}

// ---------- récupérer le panier (détails) ----------
async function getCart(cartIdParam) {
    const query = `
    query($cartId: ID!) {
        cart(id: $cartId) {
        id
        checkoutUrl
        lines(first: 100) {
            edges {
            node {
                id
                quantity
                merchandise {
                ... on ProductVariant {
                    id
                    title
                    price {
                    amount
                    currencyCode
                    }
                    product { title }
                }
                }
            }
            }
        }
        }
    }
    `;
    const variables = { cartId: cartIdParam || cartId };
    const json = await shopifyFetch({ query, variables });
    if (json.errors) {
    console.error("GraphQL errors:", json.errors);
    return null;
    }
    return json.data && json.data.cart;
}

// ---------- afficher le panier dans la page ----------
function renderCartFromCartObject(cartObj) {
    if (!cartObj) return;
    
    const edges = (cartObj.lines && cartObj.lines.edges) || [];
    const count = edges.reduce((s, e) => s + (e.node.quantity || 0), 0);
    document.getElementById('cart-count').innerText = count;

    const linesContainer = document.getElementById('cart-lines');
    linesContainer.innerHTML = "";
    if (edges.length === 0) {
    linesContainer.innerHTML = "<p>Panier vide</p>";
    return;
    }
    edges.forEach(edge => {
    const node = edge.node;
    const variant = node.merchandise;
    const title = variant.product ? variant.product.title : (variant.title || "Produit");
    const price = variant.price ? `${variant.price.amount} ${variant.price.currencyCode}` : "";
    const div = document.createElement('div');
    div.style.marginBottom = "6px";
    div.innerHTML = `<strong>${title}</strong> — ${price} × ${node.quantity}`;
    linesContainer.appendChild(div);
    // à l'intérieur de edges.forEach(edge => { ... })
    const decBtn = document.createElement('button');
    decBtn.textContent = "-";
    decBtn.className = "btn";
    decBtn.style.marginRight = "6px";
    decBtn.addEventListener('click', () => {
    decreaseCartLine(node.id, 1).catch(err => console.error(err));
    });
    div.prepend(decBtn);
    });
}

// ---------- checkout ----------
async function goToCheckout() {
    if (!cartId) {
    alert("Le panier est vide.");
    return;
    }
    const cart = await getCart(cartId);
    if (!cart) {
    alert("Impossible de récupérer le panier pour le checkout (voir console).");
    return;
    }
    if (!cart.checkoutUrl) {
    console.error("checkoutUrl manquante dans cart:", cart);
    alert("checkoutUrl manquante — voir la console.");
    return;
    }
    // redirection vers checkout sécurisé Shopify
    window.location.href = cart.checkoutUrl;
}

// ---------- initialisation UI / événements ----------
// Assure-toi que ce code s'exécute APRES que les boutons sont dans le DOM
document.querySelectorAll('.add-to-cart').forEach(btn => {
  // Si le bouton est dans un form, évite la soumission par défaut
  btn.setAttribute('type', 'button');

  btn.addEventListener('click', (e) => {
    const variantId = btn.dataset.variantId;
    if (!variantId) {
      console.error("data-variant-id manquant sur le bouton", btn);
      return;
    }
    addToCart(variantId, 1).catch(err => {
      console.error("Erreur addToCart:", err);
      alert("Erreur lors de l'ajout (voir console).");
    });
    document.getElementById("cart").classList.remove("hidden");
  });
});


document.getElementById('checkout').addEventListener('click', () => {
    goToCheckout().catch(err => {
    console.error("goToCheckout failed:", err);
    alert("Erreur lors du checkout (voir console).");
    });
});

// ---------- si on a déjà un cartId, récupère et affiche le panier ----------
(async function init() {
    if (cartId) {
    try {
        const cart = await getCart(cartId);
        if (cart) renderCartFromCartObject(cart);
        else {
        // si le cartId stocké est invalide, on le nettoie
        localStorage.removeItem(CART_KEY);
        cartId = null;
        }
    } catch (err) {
        console.error("init error:", err);
    }
    }
})();

/**
 * Enlève `amount` (par défaut 1) de la ligne de panier identifiée par lineId.
 * - Si la nouvelle quantité > 0 => cartLinesUpdate
 * - Si la nouvelle quantité <= 0 => cartLinesRemove
 *
 * Nécessite : cartId (stocké), shopifyFetch(), renderCartFromCartObject()
 */
async function decreaseCartLine(lineId, amount = 1) {
  if (!cartId) {
    console.error("Aucun cartId présent — impossible de modifier le panier.");
    return;
  }
  if (!lineId) {
    console.error("lineId manquant.");
    return;
  }

  try {
    // 1) Récupérer le panier pour connaître la quantité courante
    const cart = await getCart(cartId);
    if (!cart) {
      console.error("Impossible de récupérer le panier.");
      return;
    }

    const edges = (cart.lines && cart.lines.edges) || [];
    const edge = edges.find(e => e.node.id === lineId);
    if (!edge) {
      console.error("LineId introuvable dans le panier:", lineId);
      return;
    }

    const currentQty = edge.node.quantity || 0;
    const newQty = currentQty - amount;

    // 2) Si quantité > 0 => update, sinon => remove
    if (newQty > 0) {
      const query = `
        mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
          cartLinesUpdate(cartId: $cartId, lines: $lines) {
            cart {
              id
              lines(first: 100) {
                edges {
                  node {
                    id
                    quantity
                    merchandise {
                      ... on ProductVariant {
                        id
                        title
                        product { title }
                        price { amount currencyCode }
                      }
                    }
                  }
                }
              }
            }
            userErrors { field message }
          }
        }
      `;
      const variables = {
        cartId,
        lines: [{ id: lineId, quantity: newQty }]
      };

      const json = await shopifyFetch({ query, variables });

      if (json.errors) {
        console.error("GraphQL errors (cartLinesUpdate):", json.errors);
        alert("Erreur GraphQL — voir la console.");
        return;
      }
      const result = json.data && json.data.cartLinesUpdate;
      if (!result) {
        console.error("cartLinesUpdate absent:", json);
        alert("Erreur API — voir console.");
        return;
      }
      if (result.userErrors && result.userErrors.length) {
        console.error("cartLinesUpdate userErrors:", result.userErrors);
        alert("Impossible de mettre à jour la quantité : " + result.userErrors.map(e => e.message).join(", "));
        return;
      }

      // Met à jour l'UI avec l'objet cart renvoyé
      renderCartFromCartObject(result.cart);
      return;
    } else {
      // suppression de la ligne
      const query = `
        mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
          cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
            cart {
              id
              lines(first: 100) {
                edges {
                  node {
                    id
                    quantity
                    merchandise {
                      ... on ProductVariant {
                        id
                        title
                        product { title }
                        price { amount currencyCode }
                      }
                    }
                  }
                }
              }
            }
            userErrors { field message }
          }
        }
      `;
      const variables = { cartId, lineIds: [lineId] };

      const json = await shopifyFetch({ query, variables });

      if (json.errors) {
        console.error("GraphQL errors (cartLinesRemove):", json.errors);
        alert("Erreur GraphQL — voir la console.");
        return;
      }
      const result = json.data && json.data.cartLinesRemove;
      if (!result) {
        console.error("cartLinesRemove absent:", json);
        alert("Erreur API — voir console.");
        return;
      }
      if (result.userErrors && result.userErrors.length) {
        console.error("cartLinesRemove userErrors:", result.userErrors);
        alert("Impossible de supprimer la ligne : " + result.userErrors.map(e => e.message).join(", "));
        return;
      }

      renderCartFromCartObject(result.cart);
      return;
    }
  } catch (err) {
    console.error("Erreur decreaseCartLine:", err);
    alert("Erreur inattendue — voir la console.");
  }
}
