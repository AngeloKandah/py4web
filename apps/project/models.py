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
    Field('picture', 'text'),
    Field('description'),
)

db.users.user_email.readable = db.users.user_email.writable = False
db.users.id.readable = db.users.id.writable = False
db.users.picture.readable = db.users.picture.writable = False

db.define_table(
    'posts',
    Field('user', 'reference users'),
    Field('email', default=get_user_email()),
    Field('first_name'),
    Field('last_name'),
    Field('picture', 'text'),
    Field('post', requires = IS_NOT_EMPTY()),
)

db.define_table(
    'likes',
    Field('post', 'reference posts'),
    Field('rater', 'reference users'),
    Field('first_name'),
    Field('last_name'),
    Field('like', 'boolean', default = False),
    Field('dislike', 'boolean', deafult = False)
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
    Field('email',defaul=get_user_email()),
    Field('first_name'),
    Field('last_name'),
    Field('picture', 'text'),
    Field('comment', requires = IS_NOT_EMPTY()),
)

db.commit()
