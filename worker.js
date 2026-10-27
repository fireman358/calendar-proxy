/* calendar-proxy (gcal.edukisto.win) — proxy multi-agendas Google
   Chaque agenda Google = une entrée AGENDAS :
     chemin → https://gcal.edukisto.win/<chemin>
   Ajouter un agenda = ajouter une ligne + git push (redéploiement auto). */

const AGENDAS = {
  // Agenda privé de Papa
  "papa": "https://calendar.google.com/calendar/ical/ij2cfhsi84rqa55i0rbg2kshq4%40group.calendar.google.com/private-f8248064935dc4ce8a72d8c8d0a2b2d9/basic.ics",
  // Agenda privé de Zoé
  "zoe": "https://calendar.google.com/calendar/ical/demoulin.zoe2411%40gmail.com/private-2f2181f214092f5b2079e81aa4a2d2a7/basic.ics",
  // Agenda privé de Laeticia
  "maman": "https://calendar.google.com/calendar/ical/laeticia.softlove%40gmail.com/private-c2739db05c29d8808e9e43d762acdbc8/basic.ics",
};

/* /tout → fusion de tous les agendas en un seul flux */
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

    const nom = url.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();

    try {
      // Un agenda précis : /famille, /zoe, /maman, ...
      if (AGENDAS[nom]) {
        const data = await telechargerICS(AGENDAS[nom]);
        return reponseTexte(data, 300);
      }

      // Fusion de tous : /tout
      if (SERVIR_FUSION && (nom === "tout" || nom === "")) {
        const textes = await Promise.all(
          Object.values(AGENDAS).map(u => telechargerICS(u).catch(() => ""))
        );
        return reponseTexte(fusionner(textes), 300);
      }

      // Racine : liste des agendas disponibles (vérification rapide)
      return new Response(
        JSON.stringify({
          service: "gcal — proxy agendas Google · edukisto",
          agendas: Object.keys(AGENDAS).map(n => "/" + n),
          fusion: SERVIR_FUSION ? "/tout" : null,
        }, null, 2),
        { headers: { "Content-Type": "application/json; charset=utf-8", ...CORS } }
      );
    } catch (err) {
      return new Response("Erreur Worker: " + err.message, { status: 500, headers: CORS });
    }
  },
};
