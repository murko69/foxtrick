/**
 * links.js
 * External links collection
 * @author others, convinced, ryanli
 */

Foxtrick.util.module.register((function() {
	var storeCollection = function() {
		var collection = [];
		// load links from external feeds
		var feeds = FoxtrickPrefs.getString("module.Links.feeds") || "";
		feeds = feeds.split(/(\n|\r)+/);
		feeds = Foxtrick.filter(function(n) { return Foxtrick.trim(n) != ""; }, feeds);
		// add default feed if no feeds set
		if (feeds.length == 0)
			feeds = [Foxtrick.DataPath + "links.json"];
		// now load the feeds
		Foxtrick.log("Loading link feeds from: ", feeds);
		Foxtrick.map(function(feed) {
			Foxtrick.load(feed, function(text) {
				var key, prop;

				if (!text) {
					Foxtrick.log("Failure loading links file: ", feed);
					return;
				}
				try {
					var links = JSON.parse(text);
				}
				catch (e) {
					Foxtrick.log("Failure parsing links file: ", text);
					return;
				}
				for (key in links) {
					var link = links[key];
					for (prop in link) {
						if (prop.indexOf("link") >= 0) {
							if (typeof(collection[prop]) == 'undefined') {
								collection[prop] = {};
							}
							collection[prop][key] = link;
						}
					}
				}
				Foxtrick.sessionSet("links-collection", collection);
			});
		}, feeds);
	};

	return {
		MODULE_NAME : "Links",
		MODULE_CATEGORY : Foxtrick.moduleCategories.LINKS,
		CORE_MODULE : true,

		OPTION_FUNC : function(doc) {
			var cont = doc.createElement("div");

			var label = doc.createElement("p");
			label.setAttribute("data-text", "Links.feeds");
			cont.appendChild(label);

			var textarea = doc.createElement("textarea");
			textarea.setAttribute("pref", "module.Links.feeds");
			cont.appendChild(textarea);

			return cont;
		},

		init : function() {
			storeCollection();
		},

		getLinks : function(type, args, doc, module) {
			var makeLink = function(url) {
				var i;
				for (i in args) {
					url = url.replace(RegExp("\\[" + i + "\\]", "g"), args[i]);
				}
				return url;
			};
			var getLinkElement = function(link, url, key, module) {
				var statslink = doc.createElement("a");
				if (link.openinthesamewindow == undefined) {
					statslink.target = "_stats";
				}

				statslink.title = link.title;
				statslink.setAttribute("key", key);
				statslink.setAttribute("module", module);

				if (link.img == undefined) {
					statslink.appendChild(doc.createTextNode(link.shorttitle));
				}
				else {
					// add path to internal images
					if (link.img.indexOf('resources')==0)
						link.img = Foxtrick.ResourcePath + link.img;
					// add img for tracker flags
					if (module === "LinksTracker")
						link.appendChild(doc.createElement("img"));
					else
						Foxtrick.addImage(doc, statslink, { alt: link.shorttitle || link.title, title: link.title, src: link.img });
				}

				statslink.href = url;

				return statslink;
			};

			var collection = Foxtrick.sessionGet("links-collection");
			// links collection are not available, get them and return
			if (!collection) {
				storeCollection();
				return [];
			}

			// add current server to args first
			args.server = doc.location.hostname;

			// links to return
			var links = [];

			var key;
			for (key in collection[type]) {
				var link = collection[type][key];
				var urlTmpl = link[type].url;
				var filters = link[type].filters;

				var allowed;
				if (!FoxtrickPrefs.isModuleOptionEnabled(module.MODULE_NAME, key)) {
					// link not enabled
					allowed = false;
				}
				else if (filters && filters.length > 0) {
					// ranges to determine whether to show
					var i, j;
					for (i = 0; i < filters.length; i++) {
						var filtertype = filters[i];
						var filterranges = link[filtertype + "ranges"];
						var temp = false;

						for (j = 0; j < filterranges.length; j++) {
							if ( (args[filtertype] >= filterranges[j][0]) && (args[filtertype] <= filterranges[j][1])) {
								temp = true;
								break;
							}
						}
						if (!temp) {
							allowed = false;
							break;
						}
					}
				}
				else if (link.SUM != undefined) {
					// makes calculation of requested parameteres and place values with the others in params
					var sum, i;
					if (link.SUM) {
						for (sum in link.SUM) {
							values[sum] = 0;
							for (i = 0; i < link.SUM[sum].length; ++i) 
								values[sum] += Number(args[link.SUM[sum][i]]);
						}
					}
					// check allowed based on value comparison
					if (link.allowlink2 != undefined) {
						allowed = true; 
						if (statlink.allowlink2.GREATER) {
							allowed = allow && (values[statlink.allowlink2.GREATER[0]] > values[statlink.allowlink2.GREATER[1]]);
						}
						if (statlink.allowlink2.SMALLER) {
							allowed = allow && (values[statlink.allowlink2.SMALLER[0]] < values[statlink.allowlink2.SMALLER[1]]);
						}
						if (statlink.allowlink2.EQUAL) {
							allowed = allow && (values[statlink.allowlink2.EQUAL[0]] == values[statlink.allowlink2.EQUAL[1]]);
						}
					}
				}
				else {
					// alway shown
					allowed = true;
				}

				if (allowed) {
					var url = makeLink(urlTmpl);
					if (url != null) {
						links.push({"link" : getLinkElement(link, url, key, module.MODULE_NAME), "obj" : link});
					}
				}
			}
			links.sort(function(a, b) {
				if (a.obj.img == undefined && b.obj.img == undefined)
					return 0;
				else if (a.obj.img == undefined)
					return 1;
				else if (b.obj.img == undefined)
					return -1;
				else
					return a.obj.title.localeCompare(b.obj.title);
			});
			return links;
		}
	};
}()));
