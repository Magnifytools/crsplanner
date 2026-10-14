// Redirects any *.pages.dev host and www to the main domain (301) and serves everything else as static files.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname.endsWith('.pages.dev') || url.hostname === 'www.crsplanner.com') {
      url.hostname = 'crsplanner.com';
      url.protocol = 'https:';
      url.port = '';
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
