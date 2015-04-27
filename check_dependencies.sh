#! /bin/sh

#postgresql checks
if which psql > /dev/null; then
  echo "Found psql..."
else 
  echo "Postgres is not installed, psql not located"
  exit 1;
fi

POSTGRES_VERSION="$(psql -V | grep -o 9)"
if [ "$POSTGRES_VERSION" = "9" ]; then
  echo "Found postgres 9.x..."
else 
  echo "Postgres 9.x is required for Crypton"
  echo "On Linux please install the latest postgres server package"
  echo "On MacOS X please install postgres via Homebrew or Postgresql.app"
  exit 1;
fi

echo "Checking for Crypton user for postgres, may require user input..."
POSTGRES_USER_EXISTS="$(sudo -u postgres psql --user postgres -c "\du" | grep -o postgres)"
if [ $POSTGRES_USER_EXISTS ]; then
  echo "Found postgres user..."
else
  echo "Configuration issue: the postgres user does not exist, please create it:"
  echo "  createuser -s -r postgres"
  echo "is one way to create the postgres user"
  exit 1;
fi

# node checks
# Try node first as nodejs, for systems (like ubuntu) where 'node' is the
# amateur packet radio program:
if which nodejs > /dev/null; then
  NODECMD=nodejs
  echo "Found Node.js as $NODECMD..."
elif which node > /dev/null; then
  NODECMD=node
  echo "Found Node.js as $NODECMD..."
else
  echo "Node.js is not installed, \`which nodejs\` and \`which node\` failed"
  exit 1;
fi

NODE_VERSION="$($NODECMD --version | grep -o "0.12.")"
if [ "$NODE_VERSION" = "0.12."  ]; then
  echo "Found node 0.12.x..."
else 
  echo "Node.js 0.12.x is required for Crypton"
  echo "Please install Node.js 0.12.x"
  exit 1;
fi

# redis-server checks
if which redis-server >/dev/null; then
  echo "Found redis-server..."
else 
  echo "Redis is not installed, \`which redis-server\` failed"
  echo "Please install Redis 2.6.x or 2.8.x"
  exit 1;
fi

REDIS_VERSION=$(redis-server --version | grep -o -E "2\.6|2\.8|3\.0" | wc -c | awk {'print $1'})
if [ "$REDIS_VERSION" -ne "0"  ]; then
  echo "Found supported redis version..."
else 
  echo "Redis 2.6.x, 2.8.x or 3.0 are required for Crypton"
  echo "You have: `redis-server --version`"
  exit 1;
fi

echo "Crypton dependencies seem to be correctly installed!"
