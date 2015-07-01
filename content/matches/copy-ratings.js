'use strict';
/**
 * copy-ratings.js
 * Copies match ratings (HT-ML style)
 * @author spambot, ryanli
 */

Foxtrick.modules['CopyRatings'] = {
	MODULE_CATEGORY: Foxtrick.moduleCategories.MATCHES,
	PAGES: ['match'],

	NICE: 1, // after MatchReportFormat.

	CSS: Foxtrick.InternalPath + 'resources/css/copy-ratings.css',

	run: function(doc) {
		if (Foxtrick.Pages.Match.isPrematch(doc))
			return;

		var table = Foxtrick.Pages.Match.getRatingsTable(doc);
		if (!table)
			return;

		this.copyRatingsTable(table);
	},
	copyRatingsTable: function(table) {
		var doc = table.ownerDocument;
		var COPIED = Foxtrick.L10n.getString('copy.ratings.copied');
		var COPY = Foxtrick.L10n.getString('button.copy');
		var COPY_BOTH = Foxtrick.L10n.getString('copy.ratings.both');
		var createRatings = function(place, teams) {
			try {
				var insertBefore = null;
				if (place == 'table')
					insertBefore = doc.getElementById('oldMatchRatings');

				var team1 = (teams == 'both') || (teams == 'home');
				var team2 = (teams == 'both') || (teams == 'away');

				var byNumber = doc.getElementById('sortByNumberIcon');
				var byText = doc.getElementById('sortByTextIcon');
				var copyTextRating = !Foxtrick.hasClass(byNumber, 'disabled');
				var copyNumRating = !Foxtrick.hasClass(byText, 'disabled');

				var table = Foxtrick.Pages.Match.getRatingsTable(doc).cloneNode(true);
				Foxtrick.forEach(function(row) {
					if (!team1 && row.cells.length >= 2)
						row.cells[1].textContent = '###';
					if (!team2 && row.cells.length >= 3)
						row.cells[2].textContent = '###';
				}, table.rows);

				var youth = Foxtrick.Pages.Match.isYouth(doc) ? 'youth' : '';
				var hto = Foxtrick.Pages.Match.isHTOIntegrated(doc) ? 'tournament' : '';
				var isNT = Foxtrick.Pages.Match.isNT(doc);

				var matchlink = Foxtrick.Pages.All.getBreadCrumbs(doc)[0];
				var gameid = Foxtrick.util.id.getMatchIdFromUrl(matchlink.href);

				var headder = doc.querySelector('#mainBody h1').textContent.trim();
				var results = headder.match(/^.+(\d+) - (\d+).+$/);
				var gameresult_h = results[1];
				var gameresult_a = results[2];

				// team name links in result table no longer lead to team pages
				// however getTeams returns short team names
				var teamNames = doc.querySelectorAll('.teamName a');
				var teamLinks = Foxtrick.Pages.Match.getTeams(doc);
				var teamLink, id, name, result;

				var ad = '[table]\n';
				// head row
				ad += '[tr][th]';
				ad += '[' + youth + hto + 'matchid=' + gameid + ']';
				ad += '[/th][th]';
				if (team1) {
					teamLink = teamLinks[0];
					name = teamNames[0];
					if (teamLink) {
						id = Foxtrick.util.id.getTeamIdFromUrl(teamLink.href);
						result = (teams == 'both') ? ' - ' + gameresult_h : '';
						ad += name.textContent + result + '\n';
						if (isNT)
							ad += '[link=/Club/NationalTeam/NationalTeam.aspx?teamId=' + id + ']';
						else
							ad += '[' + youth + 'teamid=' + id + ']';
					}
				}
				if (team1 && team2)
					ad += '[/th][th]';
				if (team2) {
					teamLink = teamLinks[1];
					name = teamNames[1];
					if (teamLink) {
						id = Foxtrick.util.id.getTeamIdFromUrl(teamLink.href);
						result = (teams == 'both') ? ' - ' + gameresult_a : '';
						ad += name.textContent + result + '\n';
						if (isNT)
							ad += '[link=/Club/NationalTeam/NationalTeam.aspx?teamId=' + id + ']';
						else
							ad += '[' + youth + 'teamid=' + id + ']';
					}
				}
				ad += '[/th][/tr]\n';

				var rows = Foxtrick.toArray(table.rows).slice(1); // skip team names
				Foxtrick.forEach(function(row) {
					ad += '[tr]';
					if (row.cells[0]) {
						var colSpan = row.cells[0].colSpan;
						var cSpan = colSpan > 1 ? ' colspan=' + colSpan : '';

						ad += '[th' + cSpan + ']' + row.cells[0].textContent.trim() + '[/th]';
						if (colSpan > 1) {
							// assume the whole row is spanned and skip it
							ad += '[/tr]\n';
							return;
						}
						ad += '[td]';
					}

					if (team1) {
						if (Foxtrick.hasClass(row, 'ft_rating_table_row') ||
						    copyTextRating && row.cells[1]) {
							ad += row.cells[1].textContent.trim();
						}
						if (copyNumRating && row.cells[3]) {
							ad += ' (' + row.cells[3].textContent.trim().replace(',', '.') + ')';
						}
					}
					if (team1 && team2)
						ad += '[/td][td]';
					if (team2) {
						if (Foxtrick.hasClass(row, 'ft_rating_table_row') ||
						    copyTextRating && row.cells[2]) {
							ad += row.cells[2].textContent.trim();
						}
						if (copyNumRating && row.cells[4]) {
							ad += ' (' + row.cells[4].textContent.trim().replace(',', '.') + ')';
						}
					}
					ad += '[/td][/tr]\n';
				}, rows);

				ad = ad.replace(/\[td\]###\[\/td\]/gi, '');
				ad += '[/table]\n';

				// copy htms prediction.
				if (team1 && team2) {
					var htmsMatchDivId = doc.getElementById('htmsMatchDivId');
					if (htmsMatchDivId) {
						ad += Foxtrick.modules['HTMSPrediction'].copy(htmsMatchDivId);
					}
				}

				Foxtrick.copyStringToClipboard(ad);
				Foxtrick.util.note.add(doc, COPIED, 'ft-ratings-copy-note', { at: insertBefore });
			}
			catch (e) {
				Foxtrick.log(e);
			}
		};

		// Copy links inside the table
		var tableHeader = doc.querySelector('#oldMatchRatings .tblBox');
		var homeHeader = table.getElementsByTagName('th')[1];
		var awayHeader = table.getElementsByTagName('th')[2];

		var copyBoth = Foxtrick.createFeaturedElement(doc, this, 'span');
		copyBoth.className = 'ft_copy_rating';
		copyBoth.textContent = COPY;
		Foxtrick.onClick(copyBoth, function() { createRatings('table', 'both'); });
		tableHeader.appendChild(copyBoth);

		var copyHome = Foxtrick.createFeaturedElement(doc, this, 'span');
		copyHome.className = 'ft_copy_rating';
		copyHome.textContent = '(' + COPY + ')';
		Foxtrick.onClick(copyHome, function() { createRatings('table', 'home'); });
		homeHeader.appendChild(copyHome);

		var copyAway = Foxtrick.createFeaturedElement(doc, this, 'span');
		copyAway.className = 'ft_copy_rating';
		copyAway.textContent = '(' + COPY + ')';
		Foxtrick.onClick(copyAway, function() { createRatings('table', 'away'); });
		awayHeader.appendChild(copyAway);

		var makeBoxListener = function(team) {
			// to keep team variable here
			return function() { createRatings('box', team); };
		};
		var button = Foxtrick.util.copyButton.add(doc, COPY_BOTH);
		if (button) {
			button.title = '';
			button = Foxtrick.makeFeaturedElement(button, this);
			Foxtrick.addClass(button, 'ft-copy-ratings ft-pop-up-container');

			var list = doc.createElement('ul');
			list.className = 'ft-pop';
			var versions = ['both', 'home', 'away'];
			Foxtrick.forEach(function(version) {
				var item = doc.createElement('li');
				var link = doc.createElement('span');
				Foxtrick.onClick(link, makeBoxListener(version));
				link.textContent = Foxtrick.L10n.getString('copy.ratings.' + version);
				item.appendChild(link);
				list.appendChild(item);
			}, versions);
			button.appendChild(list);
		}
	},
};
