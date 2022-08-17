# maptorium

### Help me pls

I'm looking for good html coder and who know leaflet library/how to write leaflet plugins very well to fully rewrite User UI and add a lot of futures inside.

## Tile Map Downloader

### Description

![Main UI](/main.png)

This software can help you to download localy any tile map (now only raster type is supported). Curently you can select Google Sattelite, OSM or Yandex Sattelite map as sourse and Google Hybrid and Yandex Hybrid map as layers.

[![Maptorium promo video](http://img.youtube.com/vi/cgqhKeX2Nk4/0.jpg)](https://youtu.be/cgqhKeX2Nk4)

### Installation

```
git clone https://github.com/gunyakov/maptorium.git

cd maptorium

npm install

npm start
```

After navigate in browser to http://localhost:9000

If you have any problems during SQLite3 module compilation, run next command

```
npm install https://github.com/mapbox/node-sqlite3/tarball/master
```

### Additional Info

All tiles stored in sqlite3 DB. Storage aragement is fully compatible with [SAS Planet](https://sasgis.org)

Once you view map, it will store all tiles in DB forever.

You have 3 modes of map viewing. Internet & Cache - default mode where tiles search in DB first and if missing, then downloaded from internet. Internet only - download all tiles from internet and update tiles in DB. Cache - search tiles only in DB, no any internet use.

You can select tile, after select zoom level and sotfware will start mass tile download. Now you can add few download jobs and leave you computer unattended.

As its based on nodejs, you can install this software on oyur remote server/vps and control it directly from internet.

It's possible to use proxy server to download tiles. Now support any type of proxy: http(s), socks(4,5). Also it support using tor. If you mass download tiles from server and server ban you IP, software will sent signal to tor to change automaticaly Tor ID and continue downloading (need enable tor control port and tor auth).

To add more maps, copy any file from **maps** folder and just change map url parameters.

Next futures to add:
- More complex download job manager
- Generating up zoom layers from already dowloaded down zoom layer (Example: from Z18 generate Z17-Z10 layers, very usefull for sat imagenery to extremly decrease number of tiles to download)
- Tile cached map (View on map what tiles from selected zoom and map already in DB)

### Version

Very early version 0.8.9. Under heavy development

17.08.2022 - Random tile download mode. (See promo video how it`s work.)

16.08.2022 - Version 0.8.8. Middle update of job manager.

09.08.2022 - Version 0.8.2. Geometry editation (change from Geoman to Leaflet.editable plugin). Storage all geometry and options for geometry in DB.

16.07.2022 - Version 0.8.0. UI update.

08.05.2022 - GPS module, GPS point on map(module write for online http server to get GPS, if you need read data from usb gps, you need rewrite gps.js to get data correcly), folder structure change, some small bugs resolving (now compatible with Windows).

13.02.2022 - Basic geometry editing function (Leaflet geoman plugin). Organize DB for storing all geometry. Basic tile cached map.

01.02.2022 - Full UI remastering. Now use profesional HTML theme. Jobs list, Job status bar, Tiles Grid, etc.

29.01.2022 - Add yandex sat map, some errors resolve, UI dynamicaly get maps list from server

28.01.2022 - TOR service, SOCKS/HTTP Proxy request, Check IP during loading.

0.1.0 - Core service, Mass tiles downloading by selecting tile and zoom level.
