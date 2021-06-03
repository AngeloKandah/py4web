// This will be the object that will contain the Vue attributes
// and be used to initialize it.
let app = {};
let search = {};

// Given an empty app object, initializes it filling its attributes,
// creates a Vue instance, and then initializes the Vue instance.
let init = (app) => {

    // This is the Vue data.
    app.data = {
        query: "",
        results: [],

        names: [],
        show_modal: false,
        type: "",

        add_mode: false,
        add_comment_mode: false,
        delete_post: false,
        add_post: "",
        add_comment: "",
        cur_user_name: "",

        comments: [],
        rows: [],
        l_rows: [],
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

    app.complete = (a) => {
        a.map((e) => {
            e._like = false;
            e._dislike = false;
            e.commenting = false;
            e._lname = [];
            e._dname = [];
            e.comments = [];
            e._lnum = 0;
            e._dnum = 0;
        });
        return a;
    };

    app.add_posts = function () {
        axios.post(add_post_url,
            {
                post: app.vue.add_post,
            }).then(function (response) {
                app.vue.rows.push({
                    id: response.data.id,
                    post: app.vue.add_post,
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
                app.set_add_status(false);
            });
    };

    app.delete_posts = function (row_idx) {
        let id = app.vue.rows[row_idx].id;
        axios.get(delete_post_url, { params: { id: id } }).then(function (response) {
            for (let i = 0; i < app.vue.rows.length; i++) {
                if (app.vue.rows[i].id === id) {
                    app.vue.rows.splice(i, 1);
                    app.enumerate(app.vue.rows);
                    app.check();
                    break;
                }
            }
        });
    };

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
                    picture: response.data.picture,
                    email: response.data.email,
                });
                app.vue.rows[row_id].comments.push([app.vue.comments[app.vue.comments.length-1]])
                app.reset_comments();
                app.set_comment_status(false,row_id);
            });
    };

    app.set_comments = function () {
        for(let i = 0; i < app.vue.rows.length; i++){
            for(let j = 0; j < app.vue.comments.length; j++){
                if(app.vue.comments[j].post == app.vue.rows[i].id){
                    app.vue.rows[i].comments.push([app.vue.comments[j]])
                }
            }
        }
    }

    app.reset_comments = function () {
        app.vue.add_comment = "";
    }

    app.set_comment_status = function(new_status, row_id) {
        app.vue.add_comment_mode = new_status;
        app.vue.rows[row_id].commenting = new_status;
    }

    app.delete_comments = function (row_idx, c_id) {
        let id = c_id
        let c = app.vue.rows[row_idx].comments
        axios.get(delete_comment_url, {params: {id: id} }).then(function (response) {
            for(let i = 0; i < c.length; i++) {
                if (c[i][0].id == id) {
                    app.vue.comments.splice(i, 1);
                    c.splice([i][0], 1)
                    break;
                }
            }
        });
    };

    app.show_names = function (type, row_id) {
        app.vue.show_modal= true;
        app.vue.type = type;
        if(type === "liked"){
            app.vue.names = app.vue.rows[row_id]._lname
        }
        else{
            app.vue.names = app.vue.rows[row_id]._dname
        }
    }

    app.close_modal = function () {
        app.vue.show_modal = false;
        app.vue.names = [];
    }

    app.get_likes = function () {
        for(let i = 0; i < app.vue.l_rows.length; i++){
            axios.get(get_likes_url, { params: {id: app.vue.l_rows[i].post} }).then( function (response) {
                for(let j = 0; j < app.vue.rows.length; j++) {
                    if(app.vue.rows[j].id == app.vue.l_rows[i].post){
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
            //console.log('setting like to false');
            Vue.set(post, '_lname', "");
            Vue.set(post, '_like', false);
            Vue.set(post, '_lnum', 0)
        }
        else if (post._like === false & post._dislike === true) {
            axios.post(load_likes_url, { post: post_id, like: true, dislike: false });
            //console.log('setting dislike to true');
            Vue.set(post, '_like', true);
            Vue.set(post, '_dname', [{name:cur_user_name, id:cur_user_id}])
            Vue.set(post, '_lnum', post._lnum + 1)
            Vue.set(post, '_dnum', post._dnum - 1)
            Vue.set(post, '_dislike', false);
        }
        else if (post._like === false & post._dislike === false) {
            axios.post(load_likes_url, { post: post_id, like: true, dislike: false });
            //console.log('setting like to true');
            Vue.set(post, '_like', true);
            Vue.set(post, '_lname', [{name:cur_user_name, id:cur_user_id}]);
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
            //console.log('setting dislike to false');
            Vue.set(post, '_dname', "");
            Vue.set(post, '_dislike', false);
            Vue.set(post, '_dnum', 0)
        }
        else if (post._dislike === false & post._like === true) {
            axios.post(load_likes_url, { post: post_id, like: false, dislike: true });
            //console.log('setting dislike to true');
            Vue.set(post, '_dislike', true);
            Vue.set(post, '_dname', [{name:cur_user_name, id:cur_user_id}])
            Vue.set(post, '_dnum', post._dnum + 1)
            Vue.set(post, '_lnum', post._lnum - 1)
            Vue.set(post, '_like', false);
        }
        else if (post._dislike === false & post._like === false) {
            axios.post(load_likes_url, { post: post_id, like: false, dislike: true });
            //console.log('setting dislike to true');
            Vue.set(post, '_dislike', true);
            Vue.set(post, '_dname', [{name:cur_user_name, id:cur_user_id}])
            Vue.set(post, '_dnum', 1)
            Vue.set(post, '_like', false);
        }
        app.get_likes();
    };

    app.reset_form = function () {
        app.vue.add_post = "";
    };

    app.set_add_status = function (new_status) {
        app.vue.add_mode = new_status;
    };

    app.check_owner = function () {
        app.vue.cur_user = cur_user;
        app.vue.cur_user_id = cur_user_id;
    }

    app.check = function () {
        let l = app.vue.l_rows;
        let r = app.vue.rows;
        //Try to avoid nested for
        for(let i = 0; i < l.length; i++){
            for(let j = 0; j < r.length; j++){
                if(l[i].post === r[j].id){
                    if(l[i].like === true && l[i].rater == cur_user_id){
                        r[j]._like = true;
                    }
                    if(l[i].dislike === true && l[i].rater == cur_user_id){
                        r[j]._dislike = true;
                    }
                }
            }
        }
    }

    app.search = function () {
        if (app.vue.query.length > 1) {
            axios.get(search_url, {params: {q: app.vue.query}})
                .then(function (result) {
                    app.vue.results = result.data.results;
                });
        } else {
            app.vue.results = [];
        }
    }

    // This contains all the methods.
    app.methods = {
        // Complete as you see fit.
        search: app.search,
        set_likes: app.set_likes,
        set_dislikes: app.set_dislikes,

        show_names: app.show_names,
        close_modal: app.close_modal,
        
        check_owner: app.check_owner,
        add_posts: app.add_posts,
        set_add_status: app.set_add_status,
        delete_posts: app.delete_posts,

        add_comments: app.add_comments,
        set_comment_status: app.set_comment_status,
        delete_comments: app.delete_comments,
    };

    // This creates the Vue instance.
    app.vue = new Vue({
        el: "#vue-target",
        data: app.data,
        methods: app.methods
    });

    // And this initializes it.
    app.init = () => {
        axios.get(load_posts_url).then(function (response) {
            app.check_owner();
            app.vue.l_rows = response.data.l_rows;
            let rows = response.data.rows;
            app.enumerate(rows);
            app.complete(rows);
            let comments = response.data.comments;
            app.vue.comments = comments;
            app.vue.rows = rows;
            app.set_comments();
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

