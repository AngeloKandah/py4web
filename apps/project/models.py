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
    Field('description'),
    #Field('profile_pic', 'upload', uploadfolder=os.path.join(settings.STATIC_FOLDER,'profile_pic/')),#download_url= [=URL('static/profile_pic/users.profile_pic.b4a46652577cfb01.TWFyY2gxNy5qcGc=.jpg')])
)

db.define_table(
    'posts',
    Field('user', 'reference users'),
    Field('email', default=get_user_email()),
    Field('first_name'),
    Field('last_name'),
    Field('post', requires = IS_NOT_EMPTY()),
)

db.define_table(
    'likes',
    Field('post', 'reference posts'),
    Field('rater', default=get_user_email()),
    Field('first_name'),
    Field('last_name'),
    Field('like', 'boolean', default = False),
    Field('dislike', 'boolean', deafult = False)
)

db.users.user_email.readable = db.users.user_email.writable = False
db.users.id.readable = db.users.id.writable = False

db.commit()
