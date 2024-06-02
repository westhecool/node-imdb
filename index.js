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

async function getMetaParsed(id) { // TODO: add more data
    const meta = await getMetaRaw(id);
    var keywords = [];
    for (const keyword of meta.props.pageProps.aboveTheFoldData.keywords.edges) {
        keywords.push(keyword.node.text);
    }
    var genres = [];
    for (const genre of meta.props.pageProps.aboveTheFoldData.genres.genres) {
        genres.push(genre.text);
    }
    var images = [];
    for (const image of meta.props.pageProps.mainColumnData.titleMainImages.edges) {
        images.push({
            id: image.node.id,
            url: image.node.url,
            width: image.node.width,
            height: image.node.height
        });
    }
    var cast = [];
    for (const castMember of meta.props.pageProps.mainColumnData.cast.edges) {
        var characters = [];
        if (castMember.node.characters) {
            for (const character of castMember.node.characters) {
                characters.push(character.name);
            }
        } else {
            characters = null;
        }
        cast.push({
            id: castMember.node.name.id,
            name: castMember.node.name.nameText.text,
            image: castMember.node.name.primaryImage ? {
                url: castMember.node.name.primaryImage.url,
                width: castMember.node.name.primaryImage.width,
                height: castMember.node.name.primaryImage.height
            } : null,
            characters
        });
    }
    return {
        id: meta.props.pageProps.aboveTheFoldData.id,
        productionStatus: meta.props.pageProps.aboveTheFoldData.productionStatus ? meta.props.pageProps.aboveTheFoldData.productionStatus.currentProductionStage.text : null,
        title: meta.props.pageProps.aboveTheFoldData.titleText.text,
        titleType: meta.props.pageProps.aboveTheFoldData.titleType.text,
        plot: meta.props.pageProps.aboveTheFoldData.plot? meta.props.pageProps.aboveTheFoldData.plot.plotText.plainText : null,
        isSeries: meta.props.pageProps.aboveTheFoldData.titleType.isSeries,
        isEpisode: meta.props.pageProps.aboveTheFoldData.titleType.isEpisode,
        originalTitle: meta.props.pageProps.aboveTheFoldData.originalTitleText.text,
        certificateRating:  meta.props.pageProps.aboveTheFoldData.certificate ? meta.props.pageProps.aboveTheFoldData.certificate.rating : null,
        releaseYearRange: {
            start: meta.props.pageProps.aboveTheFoldData.releaseYear.year,
            end: meta.props.pageProps.aboveTheFoldData.releaseYear.endYear
        },
        releaseYear: meta.props.pageProps.aboveTheFoldData.releaseYear.year,
        releaseDate: {
            day: meta.props.pageProps.aboveTheFoldData.releaseDate.day,
            month: meta.props.pageProps.aboveTheFoldData.releaseDate.month,
            year: meta.props.pageProps.aboveTheFoldData.releaseDate.year
        },
        runtime: meta.props.pageProps.aboveTheFoldData.runtime ? meta.props.pageProps.aboveTheFoldData.runtime.seconds : null,
        rating: meta.props.pageProps.aboveTheFoldData.ratingsSummary.aggregateRating,
        image: meta.props.pageProps.aboveTheFoldData.primaryImage ? {
            id: meta.props.pageProps.aboveTheFoldData.primaryImage.id,
            url: meta.props.pageProps.aboveTheFoldData.primaryImage.url,
            width: meta.props.pageProps.aboveTheFoldData.primaryImage.width,
            height: meta.props.pageProps.aboveTheFoldData.primaryImage.height
        } : null,
        keywords,
        genres,
        episodes: meta.props.pageProps.aboveTheFoldData.titleType.isSeries ? meta.props.pageProps.mainColumnData.episodes.episodes.total : null,
        seasons: meta.props.pageProps.aboveTheFoldData.titleType.isSeries ? meta.props.pageProps.mainColumnData.episodes.seasons.length : null,
        images,
        cast
    }
}

async function getEpisodesParsed(id, season = 1) {
    const _episodes = await getEpisodesRaw(id, season);
    var episodes = [];
    for (const episode of _episodes.props.pageProps.contentData.section.episodes.items) {
        episodes.push({
            id: episode.id,
            title: episode.title,
            season: episode.season,
            episode: episode.episode,
            title: episode.titleText,
            releaseDate: episode.releaseDate ? {
                day: episode.releaseDate.day,
                month: episode.releaseDate.month,
                year: episode.releaseDate.year
            } : null,
            releaseYear: episode.releaseYear,
            image: {
                url: episode.image.url,
                width: episode.image.maxWidth,
                height: episode.image.maxHeight
            },
            plot: episode.plot,
            rating: episode.aggregateRating
        });
    }
    return episodes;
}

async function getAllParsed(id) {
    const meta = await getMetaParsed(id);
    var data = {
        meta,
        episodes: null
    }
    if (meta.isSeries) {
        data.episodes = [];
        for (var season = 1; season <= meta.seasons; season++) {
            data.episodes = data.episodes.concat(await getEpisodesParsed(id, season));
        }
    }
    return data;
}

module.exports = {
    search,
    getMetaRaw,
    getEpisodesRaw,
    getMetaParsed,
    getEpisodesParsed,
    getAllParsed
}