// This will be the object that will contain the Vue attributes
// and be used to initialize it.
let app = {};


// Given an empty app object, initializes it filling its attributes,
// creates a Vue instance, and then initializes the Vue instance.
let init = (app) => {

    // This is the Vue data.
    app.data = {
        add_mode: false,
        delete_post: false,
        add_post: "",
        rows: [],
        l_rows: [],
        // Complete as you see fit.
    };

    app.enumerate = (a) => {
        // This adds an _idx field to each element of the array.
        let k = 0;
        a.map((e) => {
            e._idx = k++;
            e.lhover = false;
            e.dhover = false;
        });
        return a;
    };

    app.complete = (a) => {
        a.map((e) => {
            e._like = false;
            e._dislike = false;
            e._lname = "";
            e._dname = "";
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
                    email: response.data.email,
                    _like: false,
                    _dislike: false,
                    _lname: "",
                    _dname: "",
                    lhover: false,
                    dhover: false,
                });
                app.enumerate(app.vue.rows);
                app.reset_form();
                app.set_add_status(false);
                app.dummylike();
            });
    };

    app.dummylike = function () {
        if(app.vue.rows.length > 0){
            newpost = app.vue.rows[app.vue.rows.length - 1]
            console.log(newpost)
            axios.post(load_likes_url, {post: newpost.id, like: false, dislike: false});
        }
    }

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

    app.get_likes = function () {
        for(let i = 0; i < app.vue.l_rows.length; i++){
            axios.get(get_likes_url, { params: {id: app.vue.l_rows[i].post} }).then( function (response) {
                for(let j = 0; j < app.vue.rows.length; j++) {
                    if(app.vue.rows[j].id == app.vue.l_rows[i].post){
                        app.vue.rows[j]._lname = response.data.likes;
                        Vue.set(app.vue.rows[j], '_lname', response.data.likes);
                    }
                }
            });
            axios.get(get_dislikes_url, { params: {id: app.vue.l_rows[i].post} }).then( function (response) {
                for(let j = 0; j < app.vue.rows.length; j++) {
                    if(app.vue.rows[j].id == app.vue.l_rows[i].post){
                        app.vue.rows[j]._dname = response.data.dislikes;
                        Vue.set(app.vue.rows[j], '_dname', response.data.dislikes);
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
        }
        else if (post._like === false) {
            axios.post(load_likes_url, { post: post_id, like: true, dislike: false });
            //console.log('setting like to true');
            Vue.set(post, '_like', true);
            Vue.set(post, '_lname', "Liked by " + cur_user_name);
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
        }
        else if (post._dislike === false) {
            axios.post(load_likes_url, { post: post_id, like: false, dislike: true });
            //console.log('setting dislike to true');
            Vue.set(post, '_dislike', true);
            Vue.set(post, '_dname', "Disliked by " + cur_user_name);
            Vue.set(post, '_like', false);
        }
        app.get_likes();
    };

    app.check_likes = function (row_id) {
        app.vue.rows[row_id].lhover = true;
    }

    app.check_dislikes = function (row_id) {
        app.vue.rows[row_id].dhover = true;
    }

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

    app.clear_names = function (row_id) {
        app.vue.rows[row_id].lhover = false;
        app.vue.rows[row_id].dhover = false;
    }

    app.check = function () {
        let l = app.vue.l_rows;
        let r = app.vue.rows;
        for(let i = 0; i < l.length; i++){
            for(let j = 0; j < r.length; j++){
                if(l[i].post === r[j].id){
                    if(l[i].like === true && l[i].rater === cur_user){
                        r[j]._like = true;
                    }
                    if(l[i].dislike === true && l[i].rater === cur_user){
                        r[j]._dislike = true;
                    }
                }
            }
        }
    }

    // This contains all the methods.
    app.methods = {
        // Complete as you see fit.
        set_likes: app.set_likes,
        set_dislikes: app.set_dislikes,

        clear_names: app.clear_names,
        check_likes: app.check_likes,
        check_dislikes: app.check_dislikes,

        check_owner: app.check_owner,
        add_posts: app.add_posts,
        set_add_status: app.set_add_status,
        delete_posts: app.delete_posts,
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
            app.vue.rows = rows;
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
