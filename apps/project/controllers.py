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
import json
import os
import uuid

from nqgcs import NQGCS

from py4web import action, request, abort, redirect, URL
from yatl.helpers import A
from .common import db, session, T, cache, auth, logger, authenticated, unauthenticated, flash, Field
from py4web.utils.url_signer import URLSigner
from .models import get_user_email
from py4web.utils.form import Form, FormStyleBulma
from pydal.validators import *
import re

from .settings import APP_FOLDER
from .gcs_url import gcs_url


url_signer = URLSigner(session)

BUCKET = '/gritter-project-uploads2'

GCS_KEY_PATH = os.path.join(APP_FOLDER, 'private/gcs_keys.json')
with open(GCS_KEY_PATH) as gcs_key_f:
    GCS_KEYS = json.load(gcs_key_f)

gcs = NQGCS(json_key_path=GCS_KEY_PATH)

@action('index')
@action.uses(db, auth, 'index.html')
def index():
    if get_user_email() is None:
        redirect(URL('auth/plugin/oauth2google/login'))
    user = db(db.users.user_email == get_user_email()).select().first()
    if user is None:
        redirect(URL('create_profile'))
    return dict(
        url_singer=url_signer,
        user_info_url = URL('user_info', user.id, signer=url_signer),
        load_posts_url = URL('load_posts',user.id, signer=url_signer),
        add_post_url = URL('add_posts', signer=url_signer),
        delete_post_url = URL('delete_posts', signer=url_signer),
        load_likes_url = URL('load_likes', signer=url_signer),
        get_likes_url = URL('get_likes', signer=url_signer),
        search_url = URL('search', signer=url_signer),
        add_comment_url = URL('add_comments',signer=url_signer),
        delete_comment_url = URL('delete_comments',signer=url_signer),

        cur_user = get_user_email(),
        cur_user_name = user.first_name + " " + user.last_name,
        cur_user_id = user.id,

        obtain_gcs_url = URL('obtain_gcs', signer=url_signer),

    )

@action('profile/<users_id:int>', method=["GET", "POST"])
@action.uses(db, session, auth.user, url_signer, 'profile.html')
def profile(users_id=None):
    assert users_id is not None
    user = db(db.users.user_email == get_user_email()).select().first()
    page = db(db.users.id == users_id).select().first()
    return dict(
        url_signer=url_signer,
        user_info_url = URL('user_info', users_id, signer=url_signer),
        load_posts_url = URL('load_user_posts', users_id, signer=url_signer),
        add_post_url = URL('add_posts', signer=url_signer),
        delete_post_url = URL('delete_posts', signer=url_signer),
        load_likes_url = URL('load_likes', signer=url_signer),
        get_likes_url = URL('get_likes', signer=url_signer),
        get_dislikes_url = URL('get_dislikes', signer=url_signer),
        follow_url = URL('follow', signer=url_signer),
        add_comment_url = URL('add_comments',signer=url_signer),
        delete_comment_url = URL('delete_comments',signer=url_signer),
        upload_profilepic_url = URL('upload_profilepic', signer=url_signer),

        dummy_like_url = URL('dummy_like', signer=url_signer),

        cur_user = get_user_email(),
        cur_user_name = user.first_name + " " + user.last_name,
        cur_user_id = user.id,
        page_id = page.id,

        obtain_gcs_url = URL('obtain_gcs', signer=url_signer),
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
        previous_c = db(db.comments.user == users_id).select().as_list()
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
        for id in previous_c:
            db.likes.update_or_insert(
                (db.comments.id == id["id"]),
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

@action('user_info/<users_id:int>')
@action.uses(url_signer.verify(), db)
def user_info(users_id=None):
    row = db(db.users.id == users_id).select().first()
    info = []
    user = {
        'first_name':row.first_name,
        'last_name':row.last_name,
        'picture':row.picture,
        'hardiness_zone':row.hardiness_zone,
        'description':row.description,
        'id':row.id,
        'file_path':row.file_path,
    }
    info.append(user)
    return dict(info=info)

@action('load_posts/<users_id:int>')
@action.uses(url_signer.verify(), db)
def load_posts(users_id=None):
    follows = db(db.followers.follower == users_id).select().as_list()
    following_list = []
    
    posts = []
    for follow in follows:
        posts.append(follow["following"])
        n = db(follow['following'] == db.users.id).select().first()
        if n is not None :
            full_name = n.first_name + " " + n.last_name
        name = {
            'follower':follow['follower'],
            'following':follow['following'],
            'name': full_name,
        }
        following_list.insert(0,name)

    followers = db(db.followers.following == users_id).select()
    followers_list = []
    for info in followers:
        n = db(info['follower'] == db.users.id).select().first()
        if n is not None :
            full_name = n.first_name + " " + n.last_name
        name = {
            'follower':info['follower'],
            'following':info['following'],
            'name': full_name,
        }
        followers_list.insert(0,name)

    rows = []
    rows += db(db.posts.email==get_user_email()).select().as_list()
    
    if len(follows) != 0:
        for z in range(len(posts)):
            rows += db((db.posts.user == posts[z])).select().as_list()

    def sortPost(r):
        return r['id']
        
    rows.sort(key=sortPost)

    liked = db(db.likes).select().as_list()

    rendered_liked = []
    for post in rows:
        for like in liked:
            if like["post"] == post["id"]:
                rendered_liked.append(like)

    images = []
    for p in rows:
        i = db(db.images.post == p["id"]).select().as_list()
        if i is not None:
            images += i
    
    comments = db(db.comments).select().as_list()
    return dict(
        rows=rows,
        l_rows=rendered_liked,
        comments=comments,
        followers=followers_list,
        following=following_list,
        images=images,
    )

@action('load_user_posts/<users_id:int>')
@action.uses(url_signer.verify(), db)
def load_user_posts(users_id=None):
    posts = db(db.posts.user == users_id).select().as_list()
    liked_posts = db((db.likes.rater == users_id)).select().as_list()
    comments = db(db.comments).select().as_list()
    liked = db(db.likes).select().as_list()

    images = []
    for p in posts:
        i = db(db.images.post == p["id"]).select().as_list()
        if i is not None:
            images += i

    rendered_liked = []
    for post in posts:
        for like in liked:
            if like["post"] == post["id"]:
                rendered_liked.append(like)
    

    l_posts = []
    for l in liked_posts:
        p = db(db.posts.id == l["post"]).select().as_list()
        if p is not None:
            l_posts += p

    followers = db(db.followers.following == users_id).select()
    followers_list = []
    for info in followers:
        n = db(info['follower'] == db.users.id).select().first()
        if n is not None :
            full_name = n.first_name + " " + n.last_name
        name = {
            'follower':info['follower'],
            'following':info['following'],
            'name': full_name,
        }
        followers_list.insert(0,name)

    following = db(db.followers.follower == users_id).select()
    following_list = []
    for info in following:
        n = db(info['following'] == db.users.id).select().first()
        if n is not None :
            full_name = n.first_name + " " + n.last_name
        name = {
            'follower':info['follower'],
            'following':info['following'],
            'name': full_name,
        }
        following_list.insert(0,name)
        
    return dict(
        rows=posts,
        liked_posts=l_posts,
        l_rows=rendered_liked,
        followers=followers_list,
        following=following_list,
        comments=comments,
        images=images,
    )

@action('add_posts', method="POST")
@action.uses(url_signer.verify(), db)
def add_post():
    rows = db(db.users.user_email == get_user_email()).select().first()
    first_name = rows.first_name
    last_name = rows.last_name
    picture = rows.picture

    id = db.posts.insert(
        user = db(db.users.user_email == get_user_email()).select().first(),
        email = get_user_email(),
        first_name = rows.first_name,
        last_name = rows.last_name,
        picture = rows.picture,
        post = request.json.get('post'),
        tags = request.json.get('tags'),
    )
    for i in request.json.get('image'):
        db.images.insert(
            image = i["image"],
            file_path = i["file_path"],
            post = id,
        )
    return dict(id=id,first_name=first_name,last_name=last_name,email=get_user_email(),picture=picture)

@action('add_comments', method="POST")
@action.uses(url_signer.verify(), db)
def add_comments():
    rows = db(db.users.user_email == get_user_email()).select().first()
    first_name = rows.first_name
    last_name = rows.last_name
    picture = rows.picture
    id = db.comments.insert(
        user = db(db.users.user_email == get_user_email()).select().first(),
        post = request.json.get('post'),
        email = get_user_email(),
        first_name = rows.first_name,
        last_name = rows.last_name,
        picture = rows.picture,
        comment = request.json.get('comment'),
    )
    return dict(id=id,first_name=first_name,last_name=last_name,email=get_user_email(),picture=picture)

@action('load_likes', method="POST")
@action.uses(url_signer.verify(), db)
def load_likes():
    rows = db(db.users.user_email == get_user_email()).select().first()
    post = request.json.get('post')
    like = request.json.get('like')
    dislike = request.json.get('dislike')
    if (like == False) and (dislike == False):
        db((db.likes.rater==rows.id) & (db.likes.post==post)).delete()
    else:
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
    l = db((db.likes.post == id) & (db.likes.like == True)).select()
    d = db((db.likes.post == id) & (db.likes.dislike == True)).select()
    likes = []
    dislikes = []
    for row in l:
        name = {
            'id':row["rater"],
            'name': row["first_name"] + " " + row["last_name"]
        }
        likes.insert(0, name)
    for row in d:
        name = {
            'id':row["rater"],
            'name': row["first_name"] + " " + row["last_name"]
        }
        dislikes.insert(0, name)
    return dict(likes=likes, dislikes=dislikes, lnum=len(l), dnum=len(d))

@action('delete_posts')
@action.uses(url_signer.verify(), db)
def delete_posts():
    id = request.params.get('id')
    assert id is not None
    db(db.posts.id == id).delete()
    return "ok"

@action('delete_comments')
@action.uses(url_signer.verify(), db)
def delete_comments():
    id = request.params.get('id')
    assert id is not None
    db(db.comments.id == id).delete()
    return "ok"

@action('search')
@action.uses()
def search():
    tags = request.params.get("tags")
    q = request.params.get("q")
    results = []
    if tags == "true":
        posts = db(db.posts.tags).select().as_list()
        for p in posts:
            if re.search(q, p['tags']):
                post = {
                    'id': p['user'],
                    'name': p['post'],
                }
                results.append(post)
    else:
        first = db(db.users.first_name).select().as_list()
        for f in first:
            if re.search(q.upper().lower(), f["first_name"].upper().lower() + " " + f["last_name"].upper().lower()):
                name = {
                    'id': f["id"],
                    'name': f["first_name"] + " " + f["last_name"],
                    'picture': f["picture"],
                }
                results.append(name)
    return dict(results=results)

@action('follow', method="POST")
@action.uses(url_signer.verify(), db)
def follow():
    follow = request.json.get('follow')
    page_id = request.json.get('page_id')
    cur_user = db(db.users.user_email == get_user_email()).select().first()
    if(follow==True):
        db.followers.update_or_insert(
            follower=cur_user,
            following=page_id,
        )
    else:
        db((db.followers.following == page_id) & (db.followers.follower == cur_user)).delete()
    return "ok"

@action('upload_profilepic', method="POST")
@action.uses(url_signer.verify(), db)
def upload_profilepic():
    picture = request.json.get("picture")
    users_id = request.json.get("users_id")
    file_path = request.json.get("file_path")
    previous = db(db.posts.user == users_id).select().as_list()
    previous_c = db(db.comments.user == users_id).select().as_list()
    for id in previous:
        db.posts.update_or_insert(
            (db.posts.id == id["id"]),
            picture=picture,
            file_path=file_path,
        )
    for id in previous_c:
        db.likes.update_or_insert(
            (db.comments.id == id["id"]),
            picture = picture,
            file_path=file_path,
        )
    db(db.users.user_email == get_user_email()).update(picture=picture,file_path=file_path)
    
    return "ok"

@action('obtain_gcs', method="POST")
@action.uses(url_signer.verify(), db)
def obtain_gcs():
    """Returns the URL to do download / upload / delete for GCS."""
    verb = request.json.get("action")
    if verb == "PUT":
        mimetype = request.json.get("mimetype", "")
        file_name = request.json.get("file_name")
        extension = os.path.splitext(file_name)[1]
        # Use + and not join for Windows, thanks Blayke Larue
        file_path = BUCKET + "/" + str(uuid.uuid1()) + extension
        image_url = ("https://storage.cloud.google.com" + file_path + "?authuser=0")
        # Marks that the path may be used to upload a file.
        upload_url = gcs_url(GCS_KEYS, file_path, verb='PUT',
                             content_type=mimetype)
        return dict(
            signed_url=upload_url,
            file_path=file_path,
            image_url=image_url,
        )
    elif verb in ["GET", "DELETE"]:
        file_path = request.json.get("file_path")
        if file_path is not None:
            # We check that the file_path belongs to the user.
            delete_url = gcs_url(GCS_KEYS, file_path, verb='DELETE')
            return dict(signed_url=delete_url)
        # Otherwise, we return no URL, so we don't authorize the deletion.
        return dict(signer_url=None)