/* calendar-proxy (gcal.edukisto.win) — proxy d'agendas Google pour Edukisto Home
   Deux modes :

   1. Chemins perso (optionnel) : /papa, /zoe, /maman… → URLs définies dans AGENDAS.
      Pratique pour des adresses courtes, mais nécessite un push GitHub à chaque
      nouvel agenda.

   2. Mode universel (recommandé) : /?url=<URL iCal Google encodée>
      Fonctionne avec N'IMPORTE QUEL agenda Google — le vôtre, celui d'un
      client, peu importe. L'app Edukisto Home transforme automatiquement
      les URLs Google en appels proxy. Rien à modifier ici.

   Sécurité : uniquement les URLs calendar.google.com en https. Aucun stockage. */

const AGENDAS = {
  // Chemins perso — optionnels, tu peux tout supprimer si tu n'utilises que le mode ?url=
  "papa": "https://calendar.google.com/calendar/ical/ij2cfhsi84rqa55i0rbg2kshq4%40group.calendar.google.com/private-f8248064935dc4ce8a72d8c8d0a2b2d9/basic.ics",
  "zoe": "https://calendar.google.com/calendar/ical/demoulin.zoe2411%40gmail.com/private-2f2181f214092f5b2079e81aa4a2d2a7/basic.ics",
  "maman": "https://calendar.google.com/calendar/ical/laeticia.softlove%40gmail.com/private-c2739db05c29d8808e9e43d762acdbc8/basic.ics",
};

/* /tout → fusion de tous les agendas AGENDAS (optionnel) */
const SERVIR_FUSION = true;

/* ============ Code du Worker — rien à modifier ci-dessous ============ */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

function reponseTexte(texte, secondesCache) {
  return new Response(texte, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "max-age=" + (secondesCache || 300),
    },
  });
}

async function telechargerICS(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("HTTP " + r.status);
  return await r.text();
}

function fusionner(listeICS) {
  const evenements = listeICS
    .map(txt => (txt.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || []).join("\r\n"))
    .filter(e => e)
    .join("\r\n");
  return "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//edukisto//gcal//FR\r\n"
    + evenements
    + "\r\nEND:VCALENDAR";
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    /* ---- Mode 2 : universel — /?url=<URL Google> ---- */
    const cible = url.searchParams.get("url");
    if (cible) {
      if (!/^https:\/\/calendar\.google\.com\/calendar\/ical\//.test(cible)) {
        return new Response("URL non autorisée : uniquement les agendas calendar.google.com", {
          status: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
        });
      }
      try {
        const data = await telechargerICS(cible);
        return reponseTexte(data, 300);
      } catch (err) {
        return new Response("Erreur proxy : " + err.message, {
          status: 502,
          headers: { "Access-Control-Allow-Origin": "*" },
        });
      }
    }

    /* ---- Mode 1 : chemins perso ---- */
    const nom = url.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();

    try {
      if (AGENDAS[nom]) {
        const data = await telechargerICS(AGENDAS[nom]);
        return reponseTexte(data, 300);
      }

      if (SERVIR_FUSION && (nom === "tout" || nom === "")) {
        const textes = await Promise.all(
          Object.values(AGENDAS).map(u => telechargerICS(u).catch(() => ""))
        );
        return reponseTexte(fusionner(textes), 300);
      }

      // Racine : mode d'emploi
      return new Response(
        JSON.stringify({
          service: "gcal — proxy agendas Google · edukisto",
          modeUniversel: "/?url=<URL iCal Google encodée>",
          agendasPerso: Object.keys(AGENDAS).map(n => "/" + n),
          fusion: SERVIR_FUSION ? "/tout" : null,
        }, null, 2),
        { headers: { "Content-Type": "application/json; charset=utf-8", ...CORS } }
      );
    } catch (err) {
      return new Response("Erreur Worker: " + err.message, { status: 500, headers: CORS });
    }
  },
};
