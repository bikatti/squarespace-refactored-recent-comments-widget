(function () {
    let currentPage = 1;
    let totalPages = 1000;


    function timeSince(date, now) {
        // Same timeSince function
        if (typeof date === 'string') {
            date = parseInt(date, 10);
        }

        if (date instanceof Date) {
            date = date.getTime();
        }

        let elapsed = Date.now() - date;

        const years = Math.floor(elapsed / 31536e6);
        const months = Math.floor(elapsed / 2592e6);
        const weeks = Math.floor(elapsed / 6048e5);
        const days = Math.floor(elapsed / 864e5);
        const hours = Math.floor(elapsed / 36e5);
        const minutes = Math.floor(elapsed / 6e4);
        const seconds = Math.floor(elapsed / 1e3);

        function formatTime(amount, unit) {
            let str = "";

            if (amount === 1) {
                str += (unit === "hour" ? "An " : "A ") + unit;
            } else {
                str += (amount + " " + unit + "s");
            }

            return str + " ago";
        }

        if (years > 0) return formatTime(years, "year");
        if (months > 0) return formatTime(months, "month");
        if (weeks > 0) return formatTime(weeks, "week");
        if (days > 0) return formatTime(days, "day");
        if (hours > 0) return formatTime(hours, "hour");
        if (minutes > 0) return formatTime(minutes, "minute");
        if (seconds > 0 || now) return formatTime(seconds, "second");
        return "Just now";
    }

    function initialize() {
        window.Squarespace.onInitialize(Y, function () {
            Y.use(["node", "event", "io"], function (Y) {
                if (Y.one(".recent-comments-widget")) {
                    function formatCommentList(comments, settings) {
                        // Same formatCommentList function
                        let nodeList = new Y.NodeList;
                        if (comments.length) {
                            comments.forEach(function (comment) {
                                if (comment.id) {
                                    let commentStr = `<div id="comment-${comment.id}" class="comment clearfix"><div class="comment-header `;
                                    commentStr += (comment.showAvatar ? "" : "no-avatar") + '">';
                                    commentStr += `<div class="user-info">`;
                                    if (settings.showAvatar) {
                                        commentStr += '<div class="avatar">';
                                        if (comment.memberAccount && comment.memberAccount.avatarAssetUrl) {
                                            commentStr += `<img width="100%" src="${comment.memberAccount.avatarAssetUrl}">`;
                                        } else {
                                            commentStr += '<img width="100%" src="/universal/images-v6/default-avatar.png">';
                                        }
                                        commentStr += '</div>';
                                    }
                                    commentStr += `<span class="author">${comment.authorName}</span>`;
                                    if (settings.showTime) {
                                        commentStr += `<span class="date"><time class="timesince" data-date="${comment.addedOn}">${timeSince(comment.addedOn)}</time></span>`;
                                    }
                                    if (comment.itemTitle) {
                                        commentStr += `<span class="word-delimit"></span><h3><a href="${comment.fullUrl}">${comment.itemTitle}</a></h3>`;
                                    }
                                    commentStr += "</div></div>";
                                    if (settings.showBody) {
                                        commentStr += `<div class="comment-body">${comment.body}</div>`;
                                    }
                                    commentStr += "</div>";
                                    nodeList.push(Y.Node.create(commentStr));
                                }
                            });
                        } else {
                            console.log("No comments or wrong json");
                        }
                        return nodeList;
                    }

                    function sortComments(comments) {
                        // Same sortComments function
                        return comments.sort(function (a, b) {
                            if (a.addedOn < b.addedOn) return 1;
                            if (a.addedOn > b.addedOn) return -1;
                            return 0;
                        })[0];
                    }

                    function getComments(item) {
                        // Same getComments function
                        return new Y.Promise(function (resolve, reject) {
                            Y.Data.get({
                                url: "/api/comment/GetComments",
                                secure: false,
                                data: { targetId: item.itemId, targetType: 1, since: "", page: 1, sortBy: 2 },
                                success: function (data) {
                                    resolve(data);
                                },
                                failure: function (error) {
                                    console.log(error);
                                    resolve({});
                                }
                            });
                        });
                    }

                    async function fetchAllPages(url, config, totalPages) {
                        // Same fetchAllPages function
                        const urls = Array.from({ length: totalPages }, (_, i) => `${url}&page=${i + 1}&format=json`);
                        let results;

                        try {
                            results = await Promise.all(urls.map(url => fetch(url).then(response => response.json())));
                            console.log({ results })
                        } catch (error) {
                            console.warn(error);
                            return [];
                        }

                        // Concatenate items from all results
                        let allItems = results.flatMap(result =>
                            result.items.filter(item => item.commentCount).map(item => ({
                                fullUrl: item.fullUrl,
                                itemId: item.id,
                                itemTitle: item.title,
                            }))
                        );
                        console.log({ allItems })
                        return allItems;
                    }
                    async function loadMoreComments(widget) {
                        currentPage += 1;
                        if (currentPage > totalPages) {
                            const loadMoreButton = document.getElementById('load-more-btn');
                            loadMoreButton.disabled = true;
                            loadMoreButton.style.display = 'none';
                            return;
                        }
                        widget.spinner = new Y.Squarespace.Spinner({ color: "dark", size: "large", render: widget });
                        const url = `/${widget.getData("collection")}?page=${currentPage}&format=json`;
                        const items = await fetchAllPages(url, widget, 1);
                        widget.spinner.destroy();
                        return handleItems(items, widget);
                    }

                    document.querySelectorAll('#load-more-btn').forEach(e => {
                        e.addEventListener('click', async () => {
                            console.log("loading more comments...")
                            try {
                                Y.all(".recent-comments-widget").each(async function (widget) {
                                    await loadMoreComments(widget);
                                })

                            } catch (error) {
                                console.error(error);
                            }
                        })
                    });

                    async function fetchAllComments(items, config) {
                        // Same fetchAllComments function
                        try {
                            let comments = await Promise.all(items.map(item => getComments(item)));
                            return comments;
                        } catch (error) {
                            console.error(error);
                            return [];
                        }
                    }

                    async function handleItems(items, config) {
                        // Same handleItems function
                        let allCommentsData = await fetchAllComments(items, config);
                        return handleComments(allCommentsData, items, config);
                    }

                    async function handleComments(allCommentsData, items, config) {
                        // Same handleComments function
                        let allComments = [];
                        allCommentsData.forEach(function (commentsData, index) {
                            let itemComments;

                            if (commentsData) {
                                if (config.commonSetting.showAll) {
                                    if (commentsData.comments && commentsData.comments.length) {
                                        commentsData.comments.forEach(function (comment, index) {
                                            commentsData.comments[index] = Y.merge(comment, items[index]);
                                        });
                                        allComments = allComments.concat(commentsData.comments);
                                    }
                                } else {
                                    itemComments = Y.merge(sortComments(commentsData.comments), items[index]);
                                    allComments.push(itemComments);
                                }
                            }
                        });

                        allComments = allComments.sort(function (a, b) {
                            if (a.addedOn < b.addedOn) return 1;
                            if (a.addedOn > b.addedOn) return -1;
                            return 0;
                        });

                        if (window.localStorage) {
                            window.localStorage.setItem("recent-comments-" + config.coll_id, JSON.stringify(allComments));
                        }

                        config.spinner.destroy();

                        if (allComments.length > config.max_comments) {
                            allComments = allComments.slice(0, config.max_comments);
                        }

                        config.one(".comment-list").append(formatCommentList(allComments, config.commonSetting));

                    }

                    function setupCommentWidgets() {
                        Y.all(".recent-comments-widget").each(function (widget) {
                            let itemDetails = [];

                            if (widget && widget.getData("collection")) {
                                widget.append('<div class="squarespace-recent-comments"><div class="comments-content"><div class="comment-list"></div></div></div>');

                                widget.coll_id = widget.getData("collection");
                                widget.max_comments = widget.getData("max-comments") ? parseInt(widget.getData("max-comments")) : 1;
                                widget.commonSetting = {
                                    showAvatar: "true" === widget.getData("show-avatar"),
                                    showTime: "true" === widget.getData("show-time"),
                                    showBody: "true" === widget.getData("show-body"),
                                    showAll: "true" === widget.getData("show-all")
                                };

                                if (widget.getData("insert-point") && Y.one(widget.getData("insert-point"))) {
                                    Y.one(widget.getData("insert-point")).prepend(widget);
                                }

                                if (window.localStorage && localStorage.getItem("recent-comments-" + widget.coll_id)) {
                                    widget.all_comments = JSON.parse(localStorage.getItem("recent-comments-" + widget.coll_id));
                                    try{
                                    widget.spinner.destroy(); }
                                    catch( error) { 
                                        console.log(error) 
                                    }
                                    if (widget.all_comments.length > widget.max_comments) {
                                        widget.all_comments = widget.all_comments.slice(0, widget.max_comments);
                                    }

                                    widget.one(".comment-list").prepend(formatCommentList(widget.all_comments, widget.commonSetting));
                                }

                                widget.spinner = new Y.Squarespace.Spinner({ color: "dark", size: "large", render: widget });
                                fetchAllPages("/" + widget.getData("collection") + "?format=json", widget, 1) // fetches only first page initially
                                    .then(items => handleItems(items, widget))
                                    .catch(error => console.error(error));
                            }
                        });
                    }

                    if (Y.one("#comment-styles")) {
                        setupCommentWidgets();
                    } else {
                        Y.Get.css("https://assets.squarewebsites.org/recent-comments/recent-comments.min.css", function (err, cssNode) {
                            if (err) {
                                Y.log("Error loading CSS: " + err[0].error, "error");
                            } else {
                                if (cssNode && cssNode.nodes[0]) {
                                    cssNode.nodes[0].setAttribute("id", "comment-styles");
                                }
                                setupCommentWidgets();
                            }
                        });
                    }
                }
            });
        });
    }

    if (window.Y) {
        initialize();
    } else {
        document.addEventListener("DOMContentLoaded", function eventHandler() {
            document.removeEventListener("DOMContentLoaded", eventHandler, false);
            setTimeout(initialize, 16);
        }, false);
    }

})();
