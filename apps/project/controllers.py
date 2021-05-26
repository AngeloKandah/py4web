"""
This file defines actions, i.e. functions the URLs are mapped into
The @action(path) decorator exposed the function at URL:

    http://127.0.0.1:8000/{app_name}/{path}

If app_name == '_default' then simply

    http://127.0.0.1:8000/{path}

If path == 'index' it can be omitted:

    http://127.0.0.1:8000/

The path follows the bottlepy syntax.

@action.uses('generic.html')  indicates that the action uses the generic.html template
@action.uses(session)         indicates that the action uses the session
@action.uses(db)              indicates that the action uses the db
@action.uses(T)               indicates that the action uses the i18n & pluralization
@action.uses(auth.user)       indicates that the action requires a logged in user
@action.uses(auth)            indicates that the action requires the auth object

session, db, T, auth, and tempates are examples of Fixtures.
Warning: Fixtures MUST be declared with @action.uses({fixtures}) else your app will result in undefined behavior
"""
from py4web import action, request, abort, redirect, URL
from yatl.helpers import A
from .common import db, session, T, cache, auth, logger, authenticated, unauthenticated, flash, Field
from py4web.utils.url_signer import URLSigner
from .models import get_user_email
from py4web.utils.form import Form, FormStyleBulma
from pydal.validators import *

import uuid
import random

url_signer = URLSigner(session)

@action('index')
@action.uses(db, auth, 'index.html')
def index():
    if get_user_email() is None:
        redirect(URL('auth/login'))
    user = db(db.users.user_email == get_user_email()).select().first()
    if user is None:
        redirect(URL('create_profile'))
    return dict(
        url_singer=url_signer,
        load_posts_url = URL('load_posts',user.id, signer=url_signer),
        add_post_url = URL('add_posts', signer=url_signer),
        delete_post_url = URL('delete_posts', signer=url_signer),
        load_likes_url = URL('load_likes', signer=url_signer),
        get_likes_url = URL('get_likes', signer=url_signer),
        get_dislikes_url = URL('get_dislikes', signer=url_signer),
        search_url = URL('search', signer=url_signer),

        cur_user = get_user_email(),
        cur_user_name = user.first_name + " " + user.last_name,
        cur_user_id = user.id,
    )

@action('profile/<users_id:int>', method=["GET", "POST"])
@action.uses(db, session, auth.user, url_signer, 'profile.html')
def profile(users_id=None):
    assert users_id is not None
    #to grab user do, rows[0]
    #print(rows.first_name)
    user = db(db.users.user_email == get_user_email()).select().first()
    if(users_id != user.id):
        rowss = db(db.users.id == users_id).select()
        return dict(
            rowss=rowss,
            url_signer=url_signer,
            load_posts_url = URL('load_user_posts', users_id, signer=url_signer),
            add_post_url = URL('add_posts', signer=url_signer),
            delete_post_url = URL('delete_posts', signer=url_signer),
            load_likes_url = URL('load_likes', signer=url_signer),
            get_likes_url = URL('get_likes', signer=url_signer),
            get_dislikes_url = URL('get_dislikes', signer=url_signer),
            follow_url = URL('follow', signer=url_signer),
            cur_user = get_user_email(),
            cur_user_name = user.first_name + " " + user.last_name,
            cur_user_id = user.id,
            page_id = users_id
        )
    else:
        rowss = db(db.users.user_email == get_user_email()).select()
        return dict(
            rowss=rowss,
            url_signer=url_signer,
            load_posts_url = URL('load_user_posts', user.id, signer=url_signer),
            add_post_url = URL('add_posts', signer=url_signer),
            delete_post_url = URL('delete_posts', signer=url_signer),
            load_likes_url = URL('load_likes', signer=url_signer),
            get_likes_url = URL('get_likes', signer=url_signer),
            get_dislikes_url = URL('get_dislikes', signer=url_signer),
            follow_url = URL('follow', signer=url_signer),
            cur_user = get_user_email(),
            cur_user_name = user.first_name + " " + user.last_name,
            cur_user_id = user.id,
            page_id = user.id,
        )

@action('edit_profile/<users_id:int>', method=["GET", "POST"])
@action.uses(db, session, auth.user, url_signer.verify(),'edit_profile.html')
def edit_profile(users_id=None):
    assert users_id is not None
    row = db.users[users_id]
    if row is None:
        redirect(URL('index'))
    if get_user_email() != row.user_email:
        redirect(URL('index'))
    form = Form(db.users, record=row, deletable=False, csrf_session=session, formstyle=FormStyleBulma)
    if form.accepted:
        previous = db(db.posts.user == users_id).select().as_list()
        previous_l = db(db.likes.rater == users_id).select().as_list()
        user = db(db.users.id == users_id).select().first()
        for id in previous:
            db.posts.update_or_insert(
                (db.posts.id == id["id"]),
                user=users_id,
                first_name = user.first_name,
                last_name = user.last_name,
            )
        for id in previous_l:
            db.likes.update_or_insert(
                (db.likes.id == id["id"]),
                first_name = user.first_name,
                last_name = user.last_name,
            )
        redirect(URL('profile', users_id))
    return dict(form=form)

@action('create_profile', method=["GET", "POST"])
@action.uses(db, session, auth.user, 'create_profile.html')
def create_profile():
    form = Form(db.users, deletable=False, csrf_session=session, formstyle=FormStyleBulma)
    if form.accepted:
        redirect(URL('index'))
    return dict(form=form)

@action('load_posts/<users_id:int>')
@action.uses(url_signer.verify(), db)
def load_posts(users_id=None):
    follows = db(db.followers.follower == users_id).select().as_list()
    x = []
    for follow in follows:
        x.append(follow["following"])

    rows = []
    rows += db(db.posts.email==get_user_email()).select().as_list()
    if len(follows) != 0:
        for z in range(len(x)):
            rows += db((db.posts.user == x[z])).select().as_list()

    def sortPost(r):
        return r['id']
        
    rows.sort(key=sortPost)
    l_rows = db(db.likes).select().as_list()
    return dict(rows=rows, l_rows=l_rows)

@action('load_user_posts/<users_id:int>')
@action.uses(url_signer.verify(), db)
def load_user_posts(users_id=None):
    posts = db(db.posts.user == users_id).select().as_list()
    liked = db(db.likes).select().as_list()
    return dict(rows=posts,l_rows=liked)

@action('add_posts', method="POST")
@action.uses(url_signer.verify(), db)
def add_post():
    rows = db(db.users.user_email == get_user_email()).select().first()
    first_name = rows.first_name
    last_name = rows.last_name
    id = db.posts.insert(
        user = db(db.users.user_email == get_user_email()).select().first(),
        email = get_user_email(),
        first_name = rows.first_name,
        last_name = rows.last_name,
        post = request.json.get('post'),
    )
    return dict(id=id,first_name=first_name,last_name=last_name,email=get_user_email())

@action('load_likes', method="POST")
@action.uses(url_signer.verify(), db)
def load_likes():
    rows = db(db.users.user_email == get_user_email()).select().first()
    post = request.json.get('post')
    like = request.json.get('like')
    dislike = request.json.get('dislike')
    db.likes.update_or_insert(
        ((db.likes.rater == rows.id) & (post == db.likes.post)),
        post=post,
        rater=rows.id,
        first_name=rows.first_name,
        last_name=rows.last_name,
        like=like,
        dislike=dislike,
    )
    return "ok"

@action('get_likes')
@action.uses(url_signer.verify(), db)
def get_likes():
    id = request.params.get('id')
    rows = db((db.likes.post == id) & (db.likes.like == True)).select()
    likes = 'Liked by '
    i = 0
    for row in rows:
        if i == 0:
            likes += row.first_name +  " " + row.last_name
            i = 1
        else:
            likes += ", " + row.first_name +  " " + row.last_name + " "
    if likes == 'Liked by ':
        likes = ''
    return dict(likes=likes)

@action('get_dislikes')
@action.uses(url_signer.verify(), db)
def get_dislikes():
    id = request.params.get('id')
    rows = db((db.likes.post == id) & (db.likes.dislike == True)).select()
    dislikes = 'Disliked by '
    i = 0
    for row in rows:
        if i == 0:
            dislikes += row.first_name +  " " + row.last_name
            i = 1
        else:
    
            dislikes += ", " + row.first_name +  " " + row.last_name + " "
    if dislikes == 'Disliked by ':
        dislikes = ''
    return dict(dislikes=dislikes)

@action('delete_posts')
@action.uses(url_signer.verify(), db)
def delete_posts():
    id = request.params.get('id')
    assert id is not None
    db(db.posts.id == id).delete()
    return "ok"

@action('search')
@action.uses()
def search():
    q = request.params.get("q")
    users = db((db.users.first_name == q) | (db.users.last_name == q) | (db.users.first_name + " " + db.users.last_name == q)).select().as_list()
    return dict(results=users)

@action('follow', method="POST")
@action.uses(url_signer.verify(), db)
def follow():
    follow = request.json.get('follow')
    page_id = request.json.get('page_id')
    if(follow==True):
        db.followers.update_or_insert(
            follower=db(db.users.user_email == get_user_email()).select().first(),
            following=page_id,
        )
    return "ok"