// This will be the object that will contain the Vue attributes
// and be used to initialize it.
let app = {};


// Given an empty app object, initializes it filling its attributes,
// creates a Vue instance, and then initializes the Vue instance.
let init = (app) => {

    // This is the Vue data.
    app.data = {
        add_mode: false,
        add_comment_mode: false,
        delete_post: false,

        profile: false,
        following: false,

        show_post: true,
        show_likes: false,

        add_post: "",
        add_tags: "",
        add_comment: "",
        cur_user_name: "",
        post_image: [],

        names: [],
        show_modal: false,
        type: "",

        show_followers_modal: false,
        show_following_modal: false,
        followers_list: [],
        following_list: [],
        num_followers: 0,
        num_following: 0,

        user_info: [],

        rows: [],
        comments: [],
        l_rows: [],
        follows: [],
        // Complete as you see fit.
    };

    app.enumerate = (a) => {
        // This adds an _idx field to each element of the array.
        let k = 0;
        a.map((e) => {
            e._idx = k++;
        });
        return a;
    };

    //Completes the information about the posts, preloads information
    app.complete = (a) => {
        a.map((e) => {
            e._like = false;
            e._dislike = false;
            e.commenting = false;
            e._lname = [];
            e._dname = [];
            e.image = [];
            e.comments = [];
            e._lnum = 0;
            e._dnum = 0;
        });
        return a;
    };

    //Area for posts functions
    app.add_posts = function () {
        axios.post(add_post_url,
            {
                post: app.vue.add_post,
                tags: app.vue.add_tags,
                image: app.vue.post_image,
            }).then(function (response) {
                app.vue.rows.push({
                    id: response.data.id,
                    post: app.vue.add_post,
                    tags: app.vue.add_tags,
                    image: app.vue.post_image,
                    first_name: response.data.first_name,
                    last_name: response.data.last_name,
                    picture: response.data.picture,
                    email: response.data.email,
                    _like: false,
                    _dislike: false,
                    commenting: false,
                    comments: [],
                    _lname: [],
                    _dname: [],
                    _lnum: 0,
                    _dnum: 0,
                });
                app.enumerate(app.vue.rows);
                app.reset_form();
                app.set_add_status(false, "Add");
            });
    };

    app.reset_form = function () {
        app.vue.add_post = "";
        app.vue.add_tags = "";
        app.vue.post_image = [];
    };

    app.set_add_status = function (new_status, type) {
        app.vue.add_mode = new_status;

        if(type == "Cancel"){
            if (app.vue.post_image.length > 0) {
                for (j = 0; j < app.vue.post_image.length; j++) {
                    axios.post(obtain_gcs_url, {
                        action: "DELETE",
                        file_path: app.vue.post_image[j].file_path,
                    }).then(function (r) {
                        let delete_url = r.data.signed_url;
                        if (delete_url) {

                            let req = new XMLHttpRequest();

                            req.open("DELETE", delete_url);
                            req.send();
                        };
                    });
                };
            };
        };

        app.reset_form();
    };

    app.upload_post_image = function (event) {
        let input = event.target;
        let file = input.files[0];
        if (file) {

            let file_type = file.type;
            let file_name = file.name;

            axios.post(obtain_gcs_url, {
                action: "PUT",
                mimetype: file_type,
                file_name: file_name,
            }).then((r) => {
                let upload_url = r.data.signed_url;
                let image_url = r.data.image_url;
                let file_path = r.data.file_path;

                let req = new XMLHttpRequest();

                req.addEventListener("load", function () {
                    image_info = {
                        image: image_url,
                        file_path: file_path,
                    }
                    app.vue.post_image.push(image_info)
                });
                req.open("PUT", upload_url, true)
                req.send(file);
            });
        }
    }

    app.set_images = function () {
        for (let i = 0; i < app.vue.images.length; i++) {
            for (let j = 0; j < app.vue.rows.length; j++) {
                if (app.vue.images[i].post == app.vue.rows[j].id) {
                    app.vue.rows[j].image.push(app.vue.images[i])
                    break;
                }
            }
        }
    }

    app.delete_posts = function (row_idx) {
        let id = app.vue.rows[row_idx].id;
        axios.get(delete_post_url, { params: { id: id } }).then(function (response) {
            for (let i = 0; i < app.vue.rows.length; i++) {
                if (app.vue.rows[i].id === id) {

                    if (app.vue.rows[i].image.length > 0) {
                        for (j = 0; j < app.vue.rows[i].image.length; j++) {
                            axios.post(obtain_gcs_url, {
                                action: "DELETE",
                                file_path: app.vue.rows[i].image[j].file_path,
                            }).then(function (r) {
                                let delete_url = r.data.signed_url;
                                if (delete_url) {

                                    let req = new XMLHttpRequest();

                                    req.open("DELETE", delete_url);
                                    req.send();
                                };
                            });
                        }
                    };

                    app.vue.rows.splice(i, 1);
                    app.enumerate(app.vue.rows);
                    app.check();
                    break;
                }
            }
        });
    };

    //Area for comments functions
    app.add_comments = function (row_id, post) {
        axios.post(add_comment_url,
            {
                comment: app.vue.add_comment,
                post: post,
            }).then(function (response) {
                app.vue.comments.push({
                    id: response.data.id,
                    comment: app.vue.add_comment,
                    first_name: response.data.first_name,
                    last_name: response.data.last_name,
                    email: response.data.email,
                    picture: response.data.picture,
                });
                app.vue.rows[row_id].comments.push([app.vue.comments[app.vue.comments.length - 1]])
                app.reset_comments();
                app.set_comment_status(false, row_id);
            });
    };

    app.set_comments = function () {
        for (let i = 0; i < app.vue.rows.length; i++) {
            for (let j = 0; j < app.vue.comments.length; j++) {
                if (app.vue.comments[j].post == app.vue.rows[i].id) {
                    app.vue.rows[i].comments.push([app.vue.comments[j]])
                }
            }
        }
    }

    app.reset_comments = function () {
        app.vue.add_comment = "";
    }

    app.set_comment_status = function (new_status, row_id) {
        app.reset_comments();
        app.vue.add_comment_mode = new_status;
        app.vue.rows[row_id].commenting = new_status;
    }

    app.delete_comments = function (row_idx, c_id) {
        let id = c_id
        let c = app.vue.rows[row_idx].comments
        axios.get(delete_comment_url, { params: { id: id } }).then(function (response) {
            for (let i = 0; i < c.length; i++) {
                if (c[i][0].id == id) {
                    app.vue.comments.splice(i, 1);
                    c.splice([i][0], 1)
                    break;
                }
            }
        });
    };

    //Area for following/followers information
    app.close_modal = function () {
        app.vue.show_modal = false;
        app.vue.show_followers_modal = false;
        app.vue.show_following_modal = false;
        app.vue.names = [];
    }

    app.show_followers = function (new_status) {
        app.vue.show_followers_modal = new_status;
    }

    app.show_following = function (new_status) {
        app.vue.show_following_modal = new_status;
    }

    app.get_followers = function () {
        app.vue.followers_list = app.vue.follows
        app.vue.num_followers = app.vue.follows.length;

        app.vue.following_list = app.vue.lfollowing;
        app.vue.num_following = app.vue.lfollowing.length;
    }

    app.add_follower = function (new_status, page_id) {
        if (new_status == true) {
            app.vue.following = true;
        }
        else {
            app.vue.following = false;
        }
        axios.post(follow_url, { follow: new_status, page_id: page_id });
    };

    //Area for profile post filtering
    app.set_show_post = function (new_status) {
        app.vue.show_post = new_status;
        app.vue.show_likes = !new_status;
        app.vue.rows = app.vue.user_posts;
        app.get_likes()
        app.check()
    }

    app.set_show_likes = function (new_status) {
        app.vue.show_likes = new_status;
        app.vue.show_post = !new_status;
        app.vue.rows = app.vue.liked_posts;
        app.get_likes()
        app.check()
    }

    //Function for changing profile image
    app.upload_file = function (event) {
        if (app.vue.user_info[0].picture) {
            axios.post(obtain_gcs_url, {
                action: "DELETE",
                file_path: app.vue.user_info[0].file_path,
            }).then(function (r) {
                let delete_url = r.data.signed_url;
                if (delete_url) {

                    let req = new XMLHttpRequest();

                    req.open("DELETE", delete_url);
                    req.send();
                };
            });
        };

        let input = event.target;
        let file = input.files[0];
        if (file) {

            let file_type = file.type;
            let file_name = file.name;

            axios.post(obtain_gcs_url, {
                action: "PUT",
                mimetype: file_type,
                file_name: file_name,
            }).then((r) => {
                let upload_url = r.data.signed_url;
                let image_url = r.data.image_url;
                let file_path = r.data.file_path;

                let req = new XMLHttpRequest();

                req.addEventListener("load", function () {
                    axios.post(upload_profilepic_url, {
                        picture: image_url,
                        users_id: cur_user_id,
                        file_path: file_path,
                    }).then(function (r) {
                        app.vue.user_info[0].picture = r.picture;
                    });
                });
                req.open("PUT", upload_url, true)
                req.send(file);
            });
        }
        window.location.reload();
    }

    //Area for likes functions
    app.get_likes = function () {
        for (let i = 0; i < app.vue.l_rows.length; i++) {
            axios.get(get_likes_url, { params: { id: app.vue.l_rows[i].post } }).then(function (response) {
                for (let j = 0; j < app.vue.rows.length; j++) {
                    if (app.vue.rows[j].id == app.vue.l_rows[i].post) {
                        app.vue.rows[j]._lname = response.data.likes;
                        app.vue.rows[j]._dname = response.data.dislikes;
                        Vue.set(app.vue.rows[j], '_lnum', response.data.lnum)
                        Vue.set(app.vue.rows[j], '_dnum', response.data.dnum)
                    }
                }
            });
        }
    };

    app.set_likes = function (r_idx) {
        let post = app.vue.rows[r_idx];
        let post_id = app.vue.rows[r_idx].id;
        if (post._like === true) {
            axios.post(load_likes_url, { post: post_id, like: false, dislike: false });
            Vue.set(post, '_lname', "");
            Vue.set(post, '_like', false);
            Vue.set(post, '_lnum', 0)
        }
        else if (post._like === false & post._dislike === true) {
            axios.post(load_likes_url, { post: post_id, like: true, dislike: false });
            Vue.set(post, '_like', true);
            Vue.set(post, '_dname', [{ name: cur_user_name, id: cur_user_id }])
            Vue.set(post, '_lnum', post._lnum + 1)
            Vue.set(post, '_dnum', post._dnum - 1)
            Vue.set(post, '_dislike', false);
        }
        else if (post._like === false & post._dislike === false) {
            axios.post(load_likes_url, { post: post_id, like: true, dislike: false });
            Vue.set(post, '_like', true);
            Vue.set(post, '_lname', [{ name: cur_user_name, id: cur_user_id }]);
            Vue.set(post, '_lnum', 1)
            Vue.set(post, '_dislike', false);
        }
        app.get_likes();
    };

    app.set_dislikes = function (r_idx) {
        let post = app.vue.rows[r_idx];
        let post_id = app.vue.rows[r_idx].id;
        if (post._dislike === true) {
            axios.post(load_likes_url, { post: post_id, like: false, dislike: false });
            Vue.set(post, '_dname', "");
            Vue.set(post, '_dislike', false);
            Vue.set(post, '_dnum', 0)
        }
        else if (post._dislike === false & post._like === true) {
            axios.post(load_likes_url, { post: post_id, like: false, dislike: true });
            Vue.set(post, '_dislike', true);
            Vue.set(post, '_dname', [{ name: cur_user_name, id: cur_user_id }])
            Vue.set(post, '_dnum', post._dnum + 1)
            Vue.set(post, '_lnum', post._lnum - 1)
            Vue.set(post, '_like', false);
        }
        else if (post._dislike === false & post._like === false) {
            axios.post(load_likes_url, { post: post_id, like: false, dislike: true });
            Vue.set(post, '_dislike', true);
            Vue.set(post, '_dname', [{ name: cur_user_name, id: cur_user_id }])
            Vue.set(post, '_dnum', 1)
            Vue.set(post, '_like', false);
        }
        app.get_likes();
    };

    app.show_names = function (type, row_id) {
        app.vue.show_modal = true;
        app.vue.type = type;
        if (type === "liked") {
            app.vue.names = app.vue.rows[row_id]._lname
        }
        else {
            app.vue.names = app.vue.rows[row_id]._dname
        }
    }

    //Area for page checks (owner, followers, and likes)
    app.check_owner = function () {
        app.vue.cur_user = cur_user;
        app.vue.cur_user_id = cur_user_id;
        app.vue.cur_user_name = cur_user_name;
        axios.get(user_info_url).then(function (response) {
            app.vue.user_info = response.data.info
        })
        app.vue.page_id = page_id;
        if (app.vue.page_id == app.vue.cur_user_id) {
            app.vue.profile = true;
        }
    }

    app.check_follow = function () {
        let f = app.vue.follows
        for (let i = 0; i < f.length; i++) {
            if (f[i].follower == cur_user_id) {
                app.vue.following = true;
            }
        }
    }

    app.check = function () {
        let l = app.vue.l_rows;
        let r = app.vue.rows;
        for (let i = 0; i < l.length; i++) {
            for (let j = 0; j < r.length; j++) {
                if (l[i].post === r[j].id) {
                    if (l[i].like === true && l[i].rater == cur_user_id) {
                        r[j]._like = true;
                    }
                    if (l[i].dislike === true && l[i].rater == cur_user_id) {
                        r[j]._dislike = true;
                    }
                };
            };
        };
    };

    // This contains all the methods.
    app.methods = {
        // Complete as you see fit.
        set_likes: app.set_likes,
        set_dislikes: app.set_dislikes,

        add_follower: app.add_follower,

        show_names: app.show_names,
        close_modal: app.close_modal,
        show_following: app.show_following,
        show_followers: app.show_followers,

        set_show_post: app.set_show_post,
        set_show_likes: app.set_show_likes,

        check_owner: app.check_owner,

        add_posts: app.add_posts,
        set_add_status: app.set_add_status,
        delete_posts: app.delete_posts,
        upload_post_image: app.upload_post_image,

        add_comments: app.add_comments,
        set_comment_status: app.set_comment_status,
        delete_comments: app.delete_comments,

        upload_file: app.upload_file
    };

    // This creates the Vue instance.
    app.vue = new Vue({
        el: "#vue-target",
        data: app.data,
        methods: app.methods
    });

    // And this initializes it.
    app.init = () => {
        app.check_owner();
        axios.get(load_posts_url).then(function (response) {
            app.vue.l_rows = response.data.l_rows;
            app.vue.follows = response.data.followers;
            app.vue.lfollowing = response.data.following;
            app.vue.images = response.data.images;

            app.check_follow();

            let rows = response.data.rows;
            app.enumerate(rows);
            app.complete(rows);

            let user_posts = response.data.rows;
            app.enumerate(user_posts);
            app.complete(user_posts);

            let liked_posts = response.data.liked_posts;
            app.enumerate(liked_posts);
            app.complete(liked_posts);

            let comments = response.data.comments;
            app.enumerate(comments)
            app.vue.comments = comments;

            app.vue.rows = rows;
            app.vue.user_posts = user_posts;
            app.vue.liked_posts = liked_posts;

            app.get_followers();
            app.set_comments();
            app.set_images();
            app.check();
            app.get_likes();
        })
        // Put here any initialization code.
        // Typically this is a server GET call to load the data.
    };

    // Call to the initializer.
    app.init();
};

// This takes the (empty) app object, and initializes it,
// putting all the code i
init(app);
