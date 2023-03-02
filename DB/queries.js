module.exports = {

  SELECT_ALL_POI: "SELECT * FROM poi;",

  SELECT_POI_BY_ID: "SELECT * FROM poi WHERE ID = ?;",

  SELECT_POI_BY_CATEGORY: "SELECT * FROM poi WHERE categoryID = ?;",

  SELECT_POI_BY_BOTH: "SELECT * FROM poi WHERE ID = ? AND categoryID = ?;",

  SELECT_POI_BY_NAME: "SELECT * FROM poi WHERE name = ? ORDER BY ID DESC LIMIT 1;",

  SELECT_POINTS_BY_POI: "SELECT * FROM points WHERE poiID = ?;",

  INSERT_POI: "INSERT INTO poi('categoryID', 'name', 'type', 'color', 'fillColor', 'fillOpacity', 'zoom', 'SWx', 'SWy', 'NEx', 'NEy') VALUES(1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",

  UPDATE_POI: "UPDATE poi SET SWx = ?, SWy = ?, NEx = ?, NEy = ? WHERE ID = ?;",

  INSERT_POINTS: "INSERT INTO points('poiID', 'x', 'y') VALUES (?, ?, ?);",

  DELETE_POI_BY_ID: "DELETE FROM poi WHERE ID = ?;",

  DELETE_POINTS_BY_POI: "DELETE FROM points WHERE poiID = ?;",

  UPDATE_POI_STYLE: "UPDATE poi SET categoryID = ?, name = ?, width = ?, fillOpacity = ?, color = ?, fillColor = ? WHERE ID = ?;",

  UPDATE_POI_BOUNDS: "UPDATE poi SET SWx = ?, SWy = ?, NEx = ?, NEy = ?, zoom = ? WHERE ID = ?;",

  SELECT_CATEGORY_LIST: "SELECT * FROM category;",

  SELECT_CATEGORY_BY_ID: "SELECT * FROM category WHERE ID = ?;",

  INSERT_CATEGORY: "INSERT INTO category('name', 'parentID') VALUES(?, ?);",

  INSERT_ROUTE: "INSERT INTO routeList('name', 'distance') VALUES(?, ?);",

  INSERT_ROUTE_POINT: "INSERT INTO routeCoords('routeID', 'lat', 'lon', 'date') VALUES(?, ?, ?, 'unixepoch')",

  SELECT_ROUTE_POINTS: "SELECT * FROM routeCoords WHERE routeID=? ORDER BY ID;",

  SELECT_LAST_ROUTE: "SELECT MAX(ID) as IDMAX FROM routeList;",

  SELECT_ALL_ROUTES: "SELECT * FROM routeList;",

  CREATE_STORAGE_TABLE: "CREATE TABLE IF NOT EXISTS t (x INTEGER NOT NULL,y INTEGER NOT NULL,v INTEGER DEFAULT 0 NOT NULL,c TEXT,s INTEGER DEFAULT 0 NOT NULL,h INTEGER DEFAULT 0 NOT NULL,d INTEGER NOT NULL,b BLOB,constraint PK_TB primary key (x,y,v));",

  CREATE_INDEX: "CREATE INDEX IF NOT EXISTS t_v_idx on t (v);",

  SELECT_TILE_FULL: "SELECT s, b, d, h, v FROM t WHERE x = ? AND y = ?;",

  SELECT_TILE_INFO: "SELECT s, d, h, v FROM t WHERE x = ? AND y = ?;",

  INSERT_TILE: "INSERT INTO t VALUES (?, ?, ?, ?, ?, ?, ?, ?);",

  UPDATE_TILE: "UPDATE t SET v = ?, s = ?, h = ?, d = ?, b = ? WHERE x = ? AND y = ?;"
}
