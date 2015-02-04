import os
import urllib
import urllib2
import json
import jinja2
import webapp2
from models import Store
from google.appengine.ext import db

WANTED = 5

class MainPage(webapp2.RequestHandler):
    def get(self):
        self.response.write(
            jinja2.Environment(
                loader=jinja2.FileSystemLoader(os.path.dirname(__file__)),
                extensions=['jinja2.ext.autoescape'],
                autoescape=True
            ).get_template('index.html').render({}))

class NearbyService(webapp2.RequestHandler):
  def get(self):
    # I ran out of time to silo the data per-user, so I left this as a PoC.
    nearby_query = Store.query().order(Store.distance)
    nearby = nearby_query.fetch(WANTED)
    self.response.headers['Content-Type'] = 'application/json'
    data = []
    for place in nearby:
      datum = {
          prop: getattr(place, prop)
          for prop
          in ('place_id', 'name', 'vicinity', 'icon', 'distance',)
      }
      datum['lat'] = place.client_latlng.lat
      datum['lng'] = place.client_latlng.lon
      data.append(datum)
    self.response.write(json.dumps(data))

  def post(self):
    def geocode(vicinity):
      latlng = None
      params = urllib.urlencode({'address': vicinity})
      url="https://maps.googleapis.com/maps/api/geocode/json?%s" % params
      response = urllib2.urlopen(url)
      jsongeocode = response.read()
      # I abhore having to decode _the entire response body_, but no other method
      # seemed to work, not FormData, not a GET parameter...so here you go.
      data = json.loads(jsongeocode)
      if data['status'] == 'OK' and data['results']:
        location = data['results'][0]['geometry']['location']
        latlng = "%d,%d" % (location['lat'], location['lng'])
      return db.GeoPt(latlng)
    data = json.loads(self.request.body)
    data['client_latlng'] = db.GeoPt(data.get('latlng'))
    data['latlng'] = geocode(data['vicinity'])
    store = Store(**data)
    store.put()

application = webapp2.WSGIApplication([
    ('/', MainPage),
    ('/nearby', NearbyService),
], debug=True)
