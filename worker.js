export default {
  async fetch(request) {
    // Ton URL iCal secrète Google (remplace VOTRE_URL par la tienne)
    const GOOGLE_ICAL_URL = "https://calendar.google.com/calendar/ical/ij2cfhsi84rqa55i0rbg2kshq4%40group.calendar.google.com/private-f8248064935dc4ce8a72d8c8d0a2b2d9/basic.ics";

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    try {
      const response = await fetch(GOOGLE_ICAL_URL);
      if (!response.ok) {
        return new Response("Erreur Google", { status: response.status });
      }
      const data = await response.text();
      return new Response(data, {
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "max-age=300",
        },
      });
    } catch (err) {
      return new Response("Erreur Worker: " + err.message, { status: 500 });
    }
  },
};
