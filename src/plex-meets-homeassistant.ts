/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-env browser */
import { HomeAssistant } from 'custom-card-helpers';
import _ from 'lodash';
import { css, LitElement, html, TemplateResult } from 'lit-element';
import Plex from './modules/Plex';
import PlayController from './modules/PlayController';
import { escapeHtml, getOffset } from './modules/utils';
import { CSS_STYLE, LOREM_IPSUM } from './const';
import style from './modules/style';

class PlexMeetsHomeAssistant extends LitElement {
	plexProtocol: 'http' | 'https' = 'http';

	plex: Plex | undefined;

	playController: PlayController | undefined;

	movieElems: any = [];

	activeMovieElem: HTMLElement | undefined;

	activeMovieElemData: Record<string, any> = {};

	seasonElemFreshlyLoaded = false;

	episodesElemFreshlyLoaded = false;

	detailElem: HTMLElement | undefined;

	seasonsElem: HTMLElement | undefined;

	seasonsElemHidden = true;

	episodesElem: HTMLElement | undefined;

	episodesElemHidden = true;

	data: Record<string, any> = {};

	config: Record<string, any> = {};

	requestTimeout = 3000;

	maxCount: false | number = false;

	playSupported = false;

	error = '';

	content: any;

	previousPositions: Array<any> = [];

	hassObj: HomeAssistant | undefined;

	contentBGHeight = 0;

	card: HTMLElement | undefined;

	dataLoaded = false;

	static get properties() {
		console.log('get properties');
		return {
			hass: {},
			config: {},
			props: {}
		};
	}

	set hass(hass: HomeAssistant) {
		console.log('HASS');
		this.hassObj = hass;
		if (this.plex) {
			this.playController = new PlayController(this.hassObj, this.plex, this.config.entity_id);
		}

		if (!this.content) {
			if (this.playController) {
				this.playSupported = this.playController.isPlaySupported();
			}

			this.error = '';
			if (!this.loading) {
				this.loadInitialData();
			}
		}
	}

	loadInitialData = async (): Promise<void> => {
		console.log('loadInitialData');
		this.loading = true;
		this.renderPage();
		try {
			if (this.plex) {
				const [serverID, plexSections] = await Promise.all([this.plex.getServerID(), this.plex.getSectionsData()]);
				// eslint-disable-next-line @typescript-eslint/camelcase
				this.data.serverID = serverID;
				_.forEach(plexSections, section => {
					this.data[section.title1] = section.Metadata;
				});

				if (this.data[this.config.libraryName] === undefined) {
					this.error = `Library name ${this.config.libraryName} does not exist.`;
				}

				this.loading = false;
				console.log('Loaded all!');
				// this.render();
			} else {
				throw Error('Plex not initialized.');
			}
		} catch (err) {
			// todo: proper timeout here
			this.error = `Plex server did not respond.<br/>Details of the error: ${escapeHtml(err.message)}`;
			this.renderPage();
		}
	};

	render = (): TemplateResult => {
		console.log('render');
		const contentbg = html`
			<div class="contentbg"></div>
		`;
		const detail = html`
			<div class="detail">
				<h1></h1>
				<h2></h2>
				<span class="metaInfo"></span><span class="detailDesc"></span>
				<div class="clear"></div>
			</div>
		`;
		const seasons = html`
			<div class="seasons"></div>
		`;
		const episodes = html`
			<div class="episodes"></div>
		`;
		const clear = html`
			<div class="clear"></div>
		`;
		const loading = html`
			<div style="padding:16px;">
				<div style="display: flex; align-items: center; justify-content: center;">
					<div class="lds-ring">
						<div></div>
						<div></div>
						<div></div>
						<div></div>
					</div>
				</div>
			</div>
		`;

		return html`
			<ha-card>
				${this.loading} ${loading} ${contentbg} ${detail} ${seasons} ${episodes} ${clear}
			</ha-card>
		`;
		console.log('render');
		this.previousPositions = [];
		const self = this;

		// todo: find a better way to detect resize...
		let ran = false;
		setInterval(() => {
			if (this.movieElems.length > 0) {
				let renderNeeded = false;
				if (this.previousPositions.length === 0) {
					for (let i = 0; i < this.movieElems.length; i += 1) {
						this.previousPositions[i] = {};
						this.previousPositions[i].top = this.movieElems[i].parentElement.offsetTop;
						this.previousPositions[i].left = this.movieElems[i].parentElement.offsetLeft;
					}
				}
				for (let i = 0; i < this.movieElems.length; i += 1) {
					if (
						this.previousPositions[i] &&
						this.movieElems[i].dataset.clicked !== 'true' &&
						(this.previousPositions[i].top !== this.movieElems[i].parentElement.offsetTop ||
							this.previousPositions[i].left !== this.movieElems[i].parentElement.offsetLeft)
					) {
						renderNeeded = true;
						this.previousPositions = [];
					}
				}

				if (!_.includes(this.innerHTML, '.seasons') && !ran) {
					console.log('Needs reload!');
					/*
					if (this) this.innerHTML = '';
					this.loadCustomStyles();
					*/
					// this.renderPage(false);
					// this.appendChild(style);
					ran = true;
				}

				if (renderNeeded) {
					console.log('rendering disabled todo');
					/*
					this.renderPage();
					const contentbg = this.getElementsByClassName('contentbg');
					this.contentBGHeight = (contentbg[0] as HTMLElement).scrollHeight;
					*/
				}
			}
		}, 1000);

		this.renderPage();
	};

	renderPage = (debug = false): void => {
		/*
		console.log('renderPage');
		if (!this.dataLoaded) {
			let continueLoading = true;
			if (!this.card) {
				this.card = document.createElement('ha-card');
				this.card.style.transition = '0.5s';
				this.card.style.overflow = 'hidden';
				this.card.style.padding = '16px';
				// card.header = this.config.libraryName;
				this.content = document.createElement('div');

				this.content.innerHTML = '';

				if (this.error !== '') {
					this.content.innerHTML = `Error: ${this.error}`;
					continueLoading = false;
				} else if (this.data[this.config.libraryName] && this.data[this.config.libraryName].length === 0) {
					this.content.innerHTML = `Library ${escapeHtml(this.config.libraryName)} has no items.`;
					continueLoading = false;
				} else if (this.loading) {
					this.content.style.padding = '16px 16px 16px';
					this.content.innerHTML =
						'<div style="display: flex; align-items: center; justify-content: center;"><div class="lds-ring"><div></div><div></div><div></div><div></div></div></div>';
					continueLoading = false;
				}

				this.card.appendChild(this.content);
				this.appendChild(this.card);

				this.loadCustomStyles();
			}

			if (continueLoading) {
				this.content.innerHTML = '';
				this.dataLoaded = true;
				let count = 0;

				const contentbg = document.createElement('div');
				contentbg.className = 'contentbg';
				this.content.appendChild(contentbg);
				this.detailElem = document.createElement('div');
				this.detailElem.className = 'detail';
				this.detailElem.innerHTML =
					"<h1></h1><h2></h2><span class='metaInfo'></span><span class='detailDesc'></span><div class='clear'></div>";

				if (this.playSupported) {
					// todo: temp disabled
					// this.detailElem.innerHTML += "<span class='detailPlayAction'></span>";
				}

				this.content.appendChild(this.detailElem);

				this.seasonsElem = document.createElement('div');
				this.seasonsElem.className = 'seasons';
				this.seasonsElem.addEventListener('click', () => {
					this.hideBackground();
					this.minimizeAll();
				});
				this.content.appendChild(this.seasonsElem);

				this.episodesElem = document.createElement('div');
				this.episodesElem.className = 'episodes';
				this.episodesElem.addEventListener('click', () => {
					this.hideBackground();
					this.minimizeAll();
				});
				this.content.appendChild(this.episodesElem);

				// todo: figure out why timeout is needed here and do it properly
				setTimeout(() => {
					contentbg.addEventListener('click', () => {
						this.hideBackground();
						this.minimizeAll();
					});
				}, 1);
				if (this.data[this.config.libraryName]) {
					// eslint-disable-next-line consistent-return
					_.forEach(this.data[this.config.libraryName], (movieData: Record<string, any>) => {
						if (!this.maxCount || count < this.maxCount) {
							count += 1;
							this.content.appendChild(this.getMovieElement(movieData, this.data.serverID));
						} else {
							return true;
						}
					});
				}
				const endElem = document.createElement('div');
				endElem.className = 'clear';
				this.content.appendChild(endElem);

				this.calculatePositions();
			}
		}
		return this.content.innerHTML;
		*/
	};

	calculatePositions = (): void => {
		// todo: figure out why interval is needed here and do it properly
		const setLeftOffsetsInterval = setInterval(() => {
			this.movieElems = this.getElementsByClassName('movieElem');
			for (let i = 0; i < this.movieElems.length; i += 1) {
				if (this.movieElems[i].offsetLeft === 0) {
					break;
				} else {
					clearInterval(setLeftOffsetsInterval);
				}
				this.movieElems[i].style.left = `${this.movieElems[i].offsetLeft}px`;
				this.movieElems[i].dataset.left = this.movieElems[i].offsetLeft;
				this.movieElems[i].style.top = `${this.movieElems[i].offsetTop}px`;
				this.movieElems[i].dataset.top = this.movieElems[i].offsetTop;
			}
		}, 100);
	};

	minimizeSeasons = (): void => {
		this.seasonsElemHidden = false;
		if (this.seasonsElem) {
			_.forEach(this.seasonsElem.childNodes, child => {
				const seasonElem = (child as HTMLElement).children[0] as HTMLElement;
				const seasonTitleElem = (child as HTMLElement).children[1] as HTMLElement;
				const seasonEpisodesCount = (child as HTMLElement).children[2] as HTMLElement;
				seasonElem.style.display = 'block';

				const moveElem = (elem: HTMLElement): void => {
					const seasonElemLocal = elem;
					seasonElemLocal.style.marginTop = '0';
					seasonElemLocal.style.width = `${CSS_STYLE.width}px`;
					seasonElemLocal.style.height = `${CSS_STYLE.height - 3}px`;
					seasonElemLocal.style.zIndex = '3';
					seasonElemLocal.style.marginLeft = `0px`;
					seasonElemLocal.dataset.clicked = 'false';
					seasonTitleElem.style.display = 'block';
					seasonEpisodesCount.style.display = 'block';
					setTimeout(() => {
						seasonTitleElem.style.color = 'rgba(255,255,255,1)';
						seasonEpisodesCount.style.color = 'rgba(255,255,255,1)';
					}, 500);
				};

				if (seasonElem.dataset.clicked === 'true') {
					moveElem(seasonElem);
				} else {
					setTimeout(() => {
						moveElem(seasonElem);
					}, 100);
				}
			});
		}
	};

	minimizeAll = (): void => {
		this.activeMovieElem = undefined;
		for (let i = 0; i < this.movieElems.length; i += 1) {
			if (this.movieElems[i].dataset.clicked === 'true') {
				this.movieElems[i].style.width = `${CSS_STYLE.width}px`;
				this.movieElems[i].style.height = `${CSS_STYLE.height}px`;
				this.movieElems[i].style['z-index'] = 1;
				this.movieElems[i].style.position = 'absolute';
				this.movieElems[i].style.left = `${this.movieElems[i].dataset.left}px`;
				this.movieElems[i].style.top = `${this.movieElems[i].dataset.top}px`;
				setTimeout(() => {
					this.movieElems[i].dataset.clicked = false;
				}, 500);
			}
		}
		this.hideSeasons();
		this.hideEpisodes();
		this.hideDetails();
	};

	hideSeasons = (): void => {
		if (this.seasonsElem) {
			this.seasonsElemHidden = true;
			const top = this.getTop();
			this.seasonsElem.style.top = `${top + 2000}px`;
			setTimeout(() => {
				if (this.seasonsElem && !this.seasonElemFreshlyLoaded) {
					this.seasonsElem.innerHTML = '';
					this.seasonsElem.style.display = 'none';
					this.resizeBackground();
				}
			}, 700);
		}
	};

	hideEpisodes = (): void => {
		if (this.episodesElem) {
			this.episodesElemHidden = true;
			const top = this.getTop();
			this.episodesElem.style.top = `${top + 2000}px`;
			setTimeout(() => {
				if (this.episodesElem && !this.episodesElemFreshlyLoaded) {
					this.episodesElem.innerHTML = '';
					this.episodesElem.style.display = 'none';
					this.resizeBackground();
				}
			}, 700);
		}
	};

	scrollDownInactiveSeasons = (): void => {
		if (this.seasonsElem) {
			this.seasonsElemHidden = true;
			_.forEach(this.seasonsElem.childNodes, child => {
				const seasonElem = (child as HTMLElement).children[0] as HTMLElement;
				const seasonTitleElem = (child as HTMLElement).children[1] as HTMLElement;
				const seasonEpisodesCount = (child as HTMLElement).children[2] as HTMLElement;
				if (seasonElem.dataset.clicked === 'false') {
					seasonElem.style.marginTop = '1000px';
					seasonElem.style.marginLeft = `0px`;
					setTimeout(() => {
						seasonElem.style.display = 'none';
						seasonTitleElem.style.display = 'none';
						seasonEpisodesCount.style.display = 'none';
					}, 500);
				}
			});
		}
	};

	hideDetails = (): void => {
		const top = this.getTop();
		if (this.detailElem) {
			this.detailElem.style.top = `${top - 1000}px`;
			this.detailElem.style.color = 'rgba(255,255,255,0)';
			this.detailElem.style.zIndex = '0';
			this.detailElem.style.visibility = 'hidden';
		}
	};

	showDetails = async (data: any): Promise<void> => {
		const top = this.getTop();
		if (this.detailElem) {
			this.detailElem.style.transition = '0s';
			this.detailElem.style.top = `${top - 1000}px`;

			setTimeout(() => {
				if (this.detailElem) {
					this.detailElem.style.visibility = 'visible';
					this.detailElem.style.transition = '0.7s';
					this.detailElem.style.top = `${top}px`;

					this.detailElem.children[0].innerHTML = escapeHtml(data.title);
					this.detailElem.children[1].innerHTML = escapeHtml(data.year);
					(this.detailElem.children[1] as HTMLElement).dataset.year = escapeHtml(data.year);
					this.detailElem.children[2].innerHTML = `${(data.duration !== undefined
						? `<span class='minutesDetail'>${Math.round(
								parseInt(escapeHtml(data.duration), 10) / 60 / 1000
						  )} min</span>`
						: '') +
						(data.contentRating !== undefined
							? `<span class='contentRatingDetail'>${escapeHtml(data.contentRating)}</span>`
							: '') +
						(data.rating !== undefined
							? `<span class='ratingDetail'>${data.rating < 5 ? '&#128465;' : '&#11088;'}&nbsp;${escapeHtml(
									data.rating
							  )}</span>`
							: '')}<div class='clear'></div>`;
					this.detailElem.children[3].innerHTML = escapeHtml(data.summary);
					/* todo temp disabled
					if (data.type === 'movie') {
						(this.detailElem.children[5] as HTMLElement).style.visibility = 'visible';
						this.detailElem.children[5].innerHTML = 'Play';
					} else {
						(this.detailElem.children[5] as HTMLElement).style.visibility = 'hidden';
					}
					*/

					this.detailElem.style.color = 'rgba(255,255,255,1)';
					this.detailElem.style.zIndex = '4';
				}
			}, 200);
		}
		if (this.plex && data.childCount > 0) {
			this.seasonElemFreshlyLoaded = true;
			const seasonsData = await this.plex.getLibraryData(data.key.split('/')[3]);
			if (this.seasonsElem) {
				this.seasonsElem.style.display = 'block';
				this.seasonsElem.innerHTML = '';
				this.seasonsElem.style.transition = `0s`;
				this.seasonsElem.style.top = `${top + 2000}px`;
			}

			_.forEach(seasonsData, seasonData => {
				if (this.seasonsElem) {
					this.seasonsElemHidden = false;
					const seasonContainer = document.createElement('div');
					seasonContainer.className = 'seasonContainer';
					seasonContainer.style.width = `${CSS_STYLE.width}px`;
					const thumbURL = `${this.plexProtocol}://${this.config.ip}:${this.config.port}/photo/:/transcode?width=${CSS_STYLE.expandedWidth}&height=${CSS_STYLE.expandedHeight}&minSize=1&upscale=1&url=${seasonData.thumb}&X-Plex-Token=${this.config.token}`;

					const seasonElem = document.createElement('div');
					seasonElem.className = 'seasonElem';
					seasonElem.style.width = `${CSS_STYLE.width}px`;
					seasonElem.style.height = `${CSS_STYLE.height - 3}px`;
					seasonElem.style.backgroundImage = `url('${thumbURL}')`;
					seasonElem.dataset.clicked = 'false';

					const interactiveArea = document.createElement('div');
					interactiveArea.className = 'interactiveArea';

					const playButton = document.createElement('button');
					playButton.name = 'playButton';
					playButton.addEventListener('click', event => {
						event.stopPropagation();
						if (this.plex && this.playController) {
							this.playController.play(seasonData.key.split('/')[3]);
						}
					});

					interactiveArea.append(playButton);
					seasonElem.append(interactiveArea);
					seasonContainer.append(seasonElem);

					const seasonTitleElem = document.createElement('div');
					seasonTitleElem.className = 'seasonTitleElem';
					seasonTitleElem.innerHTML = escapeHtml(seasonData.title);
					seasonContainer.append(seasonTitleElem);

					const seasonEpisodesCount = document.createElement('div');
					seasonEpisodesCount.className = 'seasonEpisodesCount';
					seasonEpisodesCount.innerHTML = `${escapeHtml(seasonData.leafCount)} episodes`;
					seasonContainer.append(seasonEpisodesCount);

					seasonContainer.addEventListener('click', event => {
						event.stopPropagation();
						if (this.activeMovieElem) {
							if (seasonElem.dataset.clicked === 'false') {
								seasonElem.dataset.clicked = 'true';
								this.activeMovieElem.style.top = `${top - 1000}px`;

								this.scrollDownInactiveSeasons();

								seasonContainer.style.top = `${-CSS_STYLE.expandedHeight}px`;
								seasonElem.style.width = `${CSS_STYLE.expandedWidth}px`;
								seasonElem.style.height = `${CSS_STYLE.expandedHeight - 6}px`;
								seasonElem.style.zIndex = '3';

								seasonElem.style.marginLeft = `-${getOffset(seasonElem).left - getOffset(this.activeMovieElem).left}px`;

								seasonTitleElem.style.color = 'rgba(255,255,255,0)';
								seasonEpisodesCount.style.color = 'rgba(255,255,255,0)';

								if (this.detailElem) {
									(this.detailElem.children[1] as HTMLElement).innerHTML = seasonData.title;
								}
								(async (): Promise<void> => {
									if (seasonData.leafCount > 0 && this.plex) {
										this.episodesElemFreshlyLoaded = true;
										const episodesData = await this.plex.getLibraryData(seasonData.key.split('/')[3]);
										if (this.episodesElem) {
											this.episodesElemHidden = false;
											this.episodesElem.style.display = 'block';
											this.episodesElem.innerHTML = '';
											this.episodesElem.style.transition = `0s`;
											this.episodesElem.style.top = `${top + 2000}px`;
											_.forEach(episodesData, episodeData => {
												if (this.episodesElem) {
													const episodeContainer = document.createElement('div');
													episodeContainer.className = 'episodeContainer';
													episodeContainer.style.width = `${CSS_STYLE.episodeWidth}px`;
													const episodeThumbURL = `${this.plexProtocol}://${this.config.ip}:${this.config.port}/photo/:/transcode?width=${CSS_STYLE.episodeWidth}&height=${CSS_STYLE.episodeHeight}&minSize=1&upscale=1&url=${episodeData.thumb}&X-Plex-Token=${this.config.token}`;

													const episodeElem = document.createElement('div');
													episodeElem.className = 'episodeElem';
													episodeElem.style.width = `${CSS_STYLE.episodeWidth}px`;
													episodeElem.style.height = `${CSS_STYLE.episodeHeight}px`;
													episodeElem.style.backgroundImage = `url('${episodeThumbURL}')`;
													episodeElem.dataset.clicked = 'false';

													const episodeInteractiveArea = document.createElement('div');
													episodeInteractiveArea.className = 'interactiveArea';

													const episodePlayButton = document.createElement('button');
													episodePlayButton.name = 'playButton';
													episodePlayButton.addEventListener('click', episodeEvent => {
														episodeEvent.stopPropagation();
														if (this.plex && this.playController) {
															this.playController.play(episodeData.key.split('/')[3], true);
														}
													});

													episodeInteractiveArea.append(episodePlayButton);

													episodeElem.append(episodeInteractiveArea);
													episodeContainer.append(episodeElem);

													const episodeTitleElem = document.createElement('div');
													episodeTitleElem.className = 'episodeTitleElem';
													episodeTitleElem.innerHTML = escapeHtml(episodeData.title);
													episodeContainer.append(episodeTitleElem);

													const episodeNumber = document.createElement('div');
													episodeNumber.className = 'episodeNumber';
													episodeNumber.innerHTML = escapeHtml(`Episode ${escapeHtml(episodeData.index)}`);
													episodeContainer.append(episodeNumber);

													episodeContainer.addEventListener('click', episodeEvent => {
														episodeEvent.stopPropagation();
													});

													this.episodesElem.append(episodeContainer);
												}
											});
											setTimeout(() => {
												if (this.episodesElem) {
													this.episodesElem.style.transition = `0.7s`;
													this.episodesElem.style.top = `${top + CSS_STYLE.expandedHeight + 16}px`;

													this.resizeBackground();
												}
											}, 200);
											setTimeout(() => {
												this.episodesElemFreshlyLoaded = false;
											}, 700);
										}
									}
								})();
							} else {
								seasonContainer.style.top = `${seasonContainer.dataset.top}px`;
								this.minimizeSeasons();
								this.hideEpisodes();
								this.activeMovieElem.style.top = `${top + 16}px`;
								if (this.detailElem && (this.detailElem.children[1] as HTMLElement)) {
									const { year } = (this.detailElem.children[1] as HTMLElement).dataset;
									if (year) {
										(this.detailElem.children[1] as HTMLElement).innerHTML = year;
									}
								}
							}
						}
					});

					this.seasonsElem.append(seasonContainer);
				}
			});

			_.forEach((this.seasonsElem as HTMLElement).children, elem => {
				const seasonElem = elem as HTMLElement;
				const left = seasonElem.offsetLeft;
				const topElem = seasonElem.offsetTop;
				seasonElem.style.left = `${left}px`;
				seasonElem.dataset.left = `${left}`;
				seasonElem.style.top = `${topElem}px`;
				seasonElem.dataset.top = `${topElem}`;
			});
			_.forEach((this.seasonsElem as HTMLElement).children, elem => {
				const seasonElem = elem as HTMLElement;
				seasonElem.style.position = 'absolute';
			});

			setTimeout(() => {
				this.seasonElemFreshlyLoaded = false;
			}, 700);

			setTimeout(() => {
				if (this.seasonsElem) {
					this.seasonsElem.style.transition = `0.7s`;
					this.seasonsElem.style.top = `${top + CSS_STYLE.expandedHeight + 16}px`;

					this.resizeBackground();
				}
			}, 200);
		}
	};

	resizeBackground = (): void => {
		if (this.seasonsElem && this.episodesElem && this.card) {
			const contentbg = this.getElementsByClassName('contentbg')[0] as HTMLElement;
			if (this.contentBGHeight === 0) {
				this.contentBGHeight = contentbg.scrollHeight;
			}
			const requiredSeasonBodyHeight =
				parseInt(this.seasonsElem.style.top.replace('px', ''), 10) + this.seasonsElem.scrollHeight;
			const requiredEpisodeBodyHeight =
				parseInt(this.episodesElem.style.top.replace('px', ''), 10) + this.episodesElem.scrollHeight;

			if (requiredSeasonBodyHeight > this.contentBGHeight && !this.seasonsElemHidden) {
				this.card.style.height = `${requiredSeasonBodyHeight + 16}px`;
			} else if (requiredEpisodeBodyHeight > this.contentBGHeight && !this.episodesElemHidden) {
				this.card.style.height = `${requiredEpisodeBodyHeight + 16}px`;
			} else {
				this.card.style.height = '100%';
			}
		}
	};

	showBackground = (): void => {
		const contentbg = this.getElementsByClassName('contentbg');
		(contentbg[0] as HTMLElement).style.zIndex = '2';
		(contentbg[0] as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.9)';
	};

	hideBackground = (): void => {
		const contentbg = this.getElementsByClassName('contentbg');
		(contentbg[0] as HTMLElement).style.zIndex = '1';
		(contentbg[0] as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0)';
	};

	activateMovieElem = (movieElem: HTMLElement): void => {
		const movieElemLocal = movieElem;
		if (movieElem.dataset.clicked === 'true') {
			this.minimizeAll();
			this.activeMovieElem = undefined;
			this.hideDetails();
			movieElemLocal.style.width = `${CSS_STYLE.width}px`;
			movieElemLocal.style.height = `${CSS_STYLE.height}px`;
			movieElemLocal.style.zIndex = '1';
			movieElemLocal.style.top = `${movieElem.dataset.top}px`;
			movieElemLocal.style.left = `${movieElem.dataset.left}px`;

			setTimeout(() => {
				movieElemLocal.dataset.clicked = 'false';
			}, 500);

			this.hideBackground();
		} else {
			const top = this.getTop();
			this.minimizeAll();
			this.showDetails(this.activeMovieElemData);
			this.showBackground();
			movieElemLocal.style.width = `${CSS_STYLE.expandedWidth}px`;
			movieElemLocal.style.height = `${CSS_STYLE.expandedHeight}px`;
			movieElemLocal.style.zIndex = '3';
			movieElemLocal.style.left = '16px';
			movieElemLocal.style.top = `${top + 16}px`;
			movieElemLocal.dataset.clicked = 'true';
			this.activeMovieElem = movieElemLocal;
		}
	};

	getTop = (): number => {
		if (this.card) {
			const doc = document.documentElement;
			const top = (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0);
			const cardTop = getOffset(this.card).top;
			if (top < cardTop - 64) {
				return 0;
			}
			return top - cardTop + 64;
		}
		return 0;
	};

	getMovieElement = (data: any, serverID: string): HTMLDivElement => {
		const thumbURL = `${this.plexProtocol}://${this.config.ip}:${this.config.port}/photo/:/transcode?width=${CSS_STYLE.expandedWidth}&height=${CSS_STYLE.expandedHeight}&minSize=1&upscale=1&url=${data.thumb}&X-Plex-Token=${this.config.token}`;

		const container = document.createElement('div');
		container.className = 'container';
		container.style.width = `${CSS_STYLE.width}px`;
		container.style.height = `${CSS_STYLE.height + 30}px`;

		const movieElem = document.createElement('div');
		movieElem.className = 'movieElem';

		movieElem.style.width = `${CSS_STYLE.width}px`;
		movieElem.style.height = `${CSS_STYLE.height}px`;
		movieElem.style.backgroundImage = `url('${thumbURL}')`;
		if (!this.playSupported) {
			movieElem.style.cursor = 'pointer';
		}

		movieElem.addEventListener('click', () => {
			this.activeMovieElemData = data;
			this.activateMovieElem(movieElem);
		});

		const playButton = this.getPlayButton();
		const interactiveArea = document.createElement('div');
		interactiveArea.className = 'interactiveArea';
		if (this.playSupported) {
			interactiveArea.append(playButton);
		}

		movieElem.append(interactiveArea);

		playButton.addEventListener('click', event => {
			event.stopPropagation();
			const keyParts = data.key.split('/');
			const movieID = keyParts[3];

			if (this.hassObj && this.playController) {
				this.playController.play(movieID, data.type === 'movie');
			}
		});

		const titleElem = document.createElement('div');
		titleElem.innerHTML = escapeHtml(data.title);
		titleElem.className = 'titleElem';
		titleElem.style.marginTop = `${CSS_STYLE.height}px`;

		const yearElem = document.createElement('div');
		yearElem.innerHTML = escapeHtml(data.year);
		yearElem.className = 'yearElem';

		container.appendChild(movieElem);
		container.appendChild(titleElem);
		container.appendChild(yearElem);

		return container;
	};

	loadCustomStyles = (): void => {
		console.log('loadCustomStyles - disabled toto');
		/*
		if (this.card) {
			this.card.appendChild(style);
		}
		*/
	};

	getPlayButton = (): HTMLButtonElement => {
		const playButton = document.createElement('button');
		playButton.name = 'playButton';
		return playButton;
	};

	setConfig = (config: any): void => {
		this.plexProtocol = 'http';
		if (!config.entity_id) {
			throw new Error('You need to define an entity_id');
		}
		if (!config.token) {
			throw new Error('You need to define a token');
		}
		if (!config.ip) {
			throw new Error('You need to define a ip');
		}
		if (!config.port) {
			throw new Error('You need to define a port');
		}
		if (!config.libraryName) {
			throw new Error('You need to define a libraryName');
		}
		this.config = config;
		if (config.protocol) {
			this.plexProtocol = config.protocol;
		}
		if (config.maxCount) {
			this.maxCount = config.maxCount;
		}

		this.plex = new Plex(this.config.ip, this.config.port, this.config.token, this.plexProtocol);
	};

	getCardSize = (): number => {
		return 3;
	};

	static get styles() {
		console.log('STYLES');
		return css`
			.detailPlayAction {
				top: 10px;
				color: rgb(15 17 19);
				font-weight: bold;
				padding: 5px 10px;
				border-radius: 5px;
				cursor: pointer;
				position: relative;
				background: orange;
			}
			.seasons {
				z-index: 5;
				position: absolute;
				top: ${CSS_STYLE.expandedHeight + 16}px;
				width: calc(100% - 32px);
				left: 0;
				padding: 16px;
			}
			.episodes {
				z-index: 4;
				position: absolute;
				top: ${CSS_STYLE.expandedHeight + 16}px;
				width: calc(100% - 32px);
				left: 0;
				padding: 16px;
				display: none;
			}
			.ratingDetail {
				background: #ffffff24;
				padding: 5px 10px;
				border-radius: 5px;
				white-space: nowrap;
				margin-bottom: 10px;
				float: left;
			}
			.contentRatingDetail {
				background: #ffffff24;
				padding: 5px 10px;
				border-radius: 5px;
				margin-right: 10px;
				white-space: nowrap;
				float: left;
				margin-bottom: 10px;
			}
			.clear {
				clear: both;
			}
			.minutesDetail {
				background: #ffffff24;
				padding: 5px 10px;
				border-radius: 5px;
				margin-right: 10px;
				white-space: nowrap;
				float: left;
				margin-bottom: 10px;
			}
			.detail .metaInfo {
				display: block;
			}
			.detail h2 {
				text-overflow: ellipsis;
				white-space: nowrap;
				overflow: hidden;
				position: relative;
				margin: 5px 0px 10px 0px;
				font-size: 16px;
			}
			.detail h1 {
				text-overflow: ellipsis;
				white-space: nowrap;
				overflow: hidden;
				position: relative;
				padding: 5px 0px;
				margin: 16px 0 10px 0;
			}
			.detail {
				visibility: hidden;
				max-height: ${CSS_STYLE.expandedHeight + 16}px;
				display: block;
				overflow: scroll;
				text-overflow: ellipsis;
			}
			.detailDesc {
				position: relative;
			}
			.lds-ring {
				display: inline-block;
				position: relative;
				width: 80px;
				height: 80px;
			}
			.lds-ring div {
				box-sizing: border-box;
				display: block;
				position: absolute;
				width: 64px;
				height: 64px;
				margin: 8px;
				border: 8px solid orange;
				border-radius: 50%;
				animation: lds-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
				border-color: orange transparent transparent transparent;
			}
			.lds-ring div:nth-child(1) {
				animation-delay: -0.45s;
			}
			.lds-ring div:nth-child(2) {
				animation-delay: -0.3s;
			}
			.lds-ring div:nth-child(3) {
				animation-delay: -0.15s;
			}
			@keyframes lds-ring {
				0% {
					transform: rotate(0deg);
				}
				100% {
					transform: rotate(360deg);
				}
			}
			.detail {
				position: absolute;
				left: 247px;
				width: calc(100% - 267px);
				z-index: 4;
				transition: 0.5s;
				color: rgba(255, 255, 255, 0);
			}
			.contentbg {
				position: absolute;
				width: 100%;
				height: 100%;
				background-color: rgba(0, 0, 0, 0);
				z-index: 0;
				transition: 0.5s;
				left: 0;
				top: 0;
			}
			.yearElem {
				color: hsla(0, 0%, 100%, 0.45);
				position: relative;
			}
			.seasonTitleElem {
				text-overflow: ellipsis;
				white-space: nowrap;
				overflow: hidden;
				position: relative;
				font-weight: bold;
				margin-top: 5px;
				transition: 0.5s;
				color: white;
			}
			.episodeTitleElem {
				text-overflow: ellipsis;
				white-space: nowrap;
				overflow: hidden;
				position: relative;
				font-weight: bold;
				margin-top: 5px;
				transition: 0.5s;
				color: white;
			}
			.seasonEpisodesCount {
				transition: 0.5s;
				color: white;
			}
			.episodeNumber {
				color: white;
			}
			.titleElem {
				text-overflow: ellipsis;
				white-space: nowrap;
				overflow: hidden;
				position: relative;
			}
			.seasonContainer {
				position: relative;
				float: left;
				margin-right: 16px;
				margin-bottom: 15px;
				transition: 0.5s;
			}
			.episodeContainer {
				position: relative;
				float: left;
				margin-right: 16px;
				margin-bottom: 15px;
				transition: 0.5s;
			}
			.episodeElem {
				background-repeat: no-repeat;
				background-size: contain;
				border-radius: 5px;
				transition: 0.5s;
			}
			.seasonElem {
				background-repeat: no-repeat;
				background-size: contain;
				border-radius: 5px;
				transition: 0.5s;
			}
			.movieElem {
				margin-bottom: 5px;
				background-repeat: no-repeat;
				background-size: contain;
				border-radius: 5px;
				transition: 0.5s;
				position: absolute;
				z-index: 1;
			}
			.container {
				z-index: 1;
				float: left;
				margin-bottom: 20px;
				margin-right: 10px;
				transition: 0.5s;
			}
			.interactiveArea {
				position: relative;
				width: 100%;
				height: 100%;
				transition: 0.5s;
				display: flex;
				align-items: center;
				justify-content: center;
			}
			.interactiveArea:hover {
				background: rgba(0, 0, 0, 0.3);
			}
			button[name='playButton'] {
				width: 40px;
				height: 40px;
				border: 2px solid white;
				border-radius: 100%;
				margin: auto;
				cursor: pointer;
				transition: 0.2s;
			}
			button[name='playButton']:hover {
				background: orange !important;
				border: 2px solid orange !important;
			}
			button[name='playButton']:focus {
				outline: 0;
				background: orange !important;
				border: 2px solid orange !important;
				box-shadow: 0 0 0 3px orange !important;
			}

			button[name='playButton']::after {
				content: '';
				display: inline-block;
				position: relative;
				top: 1px;
				left: 2px;
				border-style: solid;
				border-width: 6px 0 6px 12px;
				border-color: transparent transparent transparent white;
				transition: 0.2s;
			}

			.interactiveArea button[name='playButton'] {
				background: rgba(0, 0, 0, 0);
				border: 2px solid rgba(255, 255, 255, 0);
			}

			.interactiveArea:hover button[name='playButton'] {
				background: rgba(0, 0, 0, 0.4);
				border: 2px solid rgba(255, 255, 255, 1);
			}

			.interactiveArea button[name='playButton']:after {
				border-color: transparent transparent transparent rgba(255, 255, 255, 0);
			}

			.interactiveArea:hover button[name='playButton']:after {
				border-color: transparent transparent transparent rgba(255, 255, 255, 1);
			}

			button[name='playButton']:hover:after {
				border-color: transparent transparent transparent black !important;
			}

			button[name='playButton']:focus:after {
				border-color: transparent transparent transparent black !important;
			}
		`;
	}
}

customElements.define('plex-meets-homeassistant', PlexMeetsHomeAssistant);
