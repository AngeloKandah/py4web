"""
This file defines the database models
"""

import os

from yatl.helpers import I
from . import settings
import datetime
from .common import db, Field, auth
from pydal.validators import *


def get_user_email():
    return auth.current_user.get('email') if auth.current_user else None

def get_time():
    return datetime.datetime.utcnow()


### Define your table below
#
# db.define_table('thing', Field('name'))
#
## always commit your models to avoid problems later

db.define_table(
    'users',
    Field('user_email', default=get_user_email),
    Field('first_name', requires=IS_NOT_EMPTY()),
    Field('last_name', requires=IS_NOT_EMPTY()),
    Field('hardiness_zone', requires=IS_NOT_EMPTY()),
    Field('picture', 'text', default="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="),
    Field('description'),
    Field('file_path'),

)

db.users.user_email.readable = db.users.user_email.writable = False
db.users.id.readable = db.users.id.writable = False
db.users.picture.readable = db.users.picture.writable = False
db.users.file_path.readable = db.users.file_path.writable = False

db.define_table(
    'posts',
    Field('user', 'reference users'),
    Field('email', default=get_user_email()),
    Field('first_name'),
    Field('last_name'),
    Field('picture', 'text'),
    Field('post', requires = IS_NOT_EMPTY()),
    Field('tags'),
)

db.define_table(
    'images',
    Field('post', 'reference posts'),
    Field('image'),
    Field('file_path'),
)

db.define_table(
    'likes',
    Field('post', 'reference posts'),
    Field('rater', 'reference users'),
    Field('first_name'),
    Field('last_name'),
    Field('like', 'boolean', default = False),
    Field('dislike', 'boolean', default = False)
)

db.define_table(
    'followers',
    Field('follower', 'reference users'),
    Field('following', 'reference users'),
)

db.define_table(
    'comments',
    Field('user', 'reference users'),
    Field('post', 'reference posts'),
    Field('email', default=get_user_email()),
    Field('first_name'),
    Field('last_name'),
    Field('picture', 'text'),
    Field('comment', requires = IS_NOT_EMPTY()),
)

db.commit()
