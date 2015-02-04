from google.appengine.ext import ndb

class Store(ndb.Model):
  place_id = ndb.StringProperty(indexed=False)
  name = ndb.StringProperty(indexed=False)
  vicinity = ndb.StringProperty(indexed=False)
  icon = ndb.StringProperty(indexed=False)
  distance = ndb.IntegerProperty(indexed=True)
  client_latlng = ndb.GeoPtProperty(indexed=True)
  latlng = ndb.GeoPtProperty(indexed=True)
