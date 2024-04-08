const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36';
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

async function search(query) {
    const response = await fetch(`https://v3.sg.media-imdb.com/suggestion/x/${encodeURIComponent(query)}.json`, {
        headers: {
            'User-Agent': USER_AGENT
        }
    });
    const data = await response.json();
    var results = [];
    for (const item of data.d) {
        results.push({
            image: item.i,
            id: item.id,
            title: item.l,
            year: item.y,
            runningYears: item.yr || item.y,
            type: item.qid,
            rank: item.rank,
            people: item.s
        });
    }
    return results;
}

async function getMetaRaw(id) {
    const response = await fetch(`https://www.imdb.com/title/${id}`, {
        headers: {
            'User-Agent': USER_AGENT
        }
    });
    const data = await response.text();
    const dom = new JSDOM(data);
    const json = JSON.parse(dom.window.document.querySelector('script[id="__NEXT_DATA__"]').textContent);
    return json;
}

async function getEpisodesRaw(id, season = 1) {
    const response = await fetch(`https://www.imdb.com/title/${id}/episodes?season=${season}`, {
        headers: {
            'User-Agent': USER_AGENT
        }
    });
    const data = await response.text();
    const dom = new JSDOM(data);
    const json = JSON.parse(dom.window.document.querySelector('script[id="__NEXT_DATA__"]').textContent);
    return json;
}

module.exports = {
    search,
    getMetaRaw,
    getEpisodesRaw
}