const hdSearchQuery = "1/2 SPRUCE STANDARD PLY *RED*";
const hdQueryEncoded = encodeURIComponent(hdSearchQuery);
const hdHashQuery = hdQueryEncoded.replace(/%2F/ig, '/');
console.log(`https://www.homedepot.ca/search?q=${hdQueryEncoded}#!q=${hdHashQuery}`);
