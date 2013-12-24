# Crypton

A framework for creating zero-knowledge web applications

[![Build Status](https://travis-ci.org/SpiderOak/crypton.png?branch=master)](https://travis-ci.org/SpiderOak/crypton)

## What is Zero Knowledge?

Zero Knowledge applications offer meaningful privacy assurance to end users
because the servers running the application cannot read the data created and
stored by the application.

To learn more, check out the [Crypton website](https://crypton.io/).

## WARNING

This is an early stage project at v0.0.1 which is a proof of core concepts.  It
is not yet intended for production use until v0.1.0.  There are known serious
bugs and weaknesses.

Most importantly, it has not been through a first round of refactoring, general
code cleanup, and security review. It does not have comprehensive test
coverage.  All of these things will change in the versions between v0.0.1 and
v0.1.0, at which point we'll make a first stable release that we encourage for
production and commercial uses. 

## Get Started

To get started with Crypton development, you will need node.js v0.10.x with npm,
and uglify-js. You will need a postgresql server running on localhost (or
edit the config file in the `server/` directory), and Redis.

You can check your system for the correct dependencies by running (in this directory):

sh ./check_dependencies.sh

Clone the repository and run `make` to install the rest of the dependencies and
run the tests.

See the crypton.io [getting-started page](https://crypton.io/getting-started) for more.

### Running the Crypton server locally

#### Production deployment and ongoing development:

The facilities in the distribution's ansible subdiretory provides a comprehensive virtual-guest installation of the crypton server and all its dependencies. See ansible/README.md for details.


#### Quick, low-overhead exploration and development:

For a low-overhead avenue to start the server in order to just try crypton, quickly - provided you have all the dependencies; see server/package.json:

* The default configuration (``./server/config/config.test.json``) depends on the [redis](http://redis.io/) (key/value storage service) server running on your host:
 * Install redis
 * Start the redis server: ``/usr/local/bin/redis-server &``

* Start the Crypton server:

  ``sudo node ./server/bin/cli.js [ --config configfile ]``

 * Sudo is necessary for access to privileged network sockets
 * The default config file depends on redis, see above.

#### Ongoing development:

For a more lasting setup, but still for development rather than production deployment:

* You will still need to have redis-server running on the crypton host - see above.

* in the ./server package, ``npm link``
 * This establishes /usr/local/bin/crypton script which is a link to server/bin/cli.js, for use from anywhere on your system
 * It also creates a /usr/local/lib/node_modules/crypton link to the server directory, establishing the server package as a system wide node module.

Then, if you npm link crypton in other software that has a node_modules directory, the crypton server package will be included there, via a symlink.

## Documentation

There are files describing the high-level specification in the `client/doc/`
and `server/doc/` directories, but currently, the best way to get a complete
picture of the Crypton system is by understanding the database schema, in
`server/lib/stores/postgres/sql/setup.sql`, which has lots of explanatory
comments.

See also the crypton.io [developer guide](https://crypton.io/developer-guide).


## Getting Help

If you have questions that aren't answered by the provided documentation, you
can contact us at crypton-discussion@crypton.io

## Contributing

Check out the code from our
[GitHub repository](https://github.com/SpiderOak/crypton)!
This is where we are keeping our wiki and issue tracker for the project, along
with the JavaScript reference implementation.

If you are not a developer but would like to contribute in other ways, consider:

* Becoming a
  [Zero Knowledge Privacy Ambassador](https://spideroak.com/blog/20121121085239-looking-for-a-few-good-ambassadors)
* Purchasing from companies that provide a product with meaningful privacy
  built in.
* Contacting the creators of the software products you use, and making it clear
  you would appreciate them including privacy features.

## License

See the LICENSE file.
