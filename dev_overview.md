# Developers' Overview of Crypton

## User Account Generation and Authentication

## Client Side Data Processing Instead of Server Side Processing



At first glance it might seem like this arrangement means that some features
are impossible for the application to provide, such as information searching
and aggregating.  We'll show how these are accomplished.

## Storage via an Object Database

The object database included with Crypton is intended to become similar to ZODB
with a similar amount of internal optimization and caching for various types of
data structures.

Many developers are already familiar with using an Object Database, but they
are so easy to understand we'll give a brief description here.

```javascript
// The basic idea of an object database is simply that you store objects as
// they exist natively within your programming language, and the object
// database takes care of persisting them, caching them, saving changes, etc. 

// The interface to an object database is generally through a root object, 
// which you extend to many levels to store whatever data your applicaiton
// needs.

// Object databases generally
// expose a root object, which can be extended to any level.
var db = new ObjectDB();

// For example, a book catalog might look like this:

// We just add objects to the database.
db.books = [];
db.authors = [];
db.publishers = [];

// and treat them like regular objects.

new_author_id = uuid();
db.authors.push({ 
  id: new_author_id,
  name: "Arnold Robbits"
});

new_publisher_id = uuid();
db.publishers.push({
  id: new_publisher_id,
  name: "O'Reilly Media, Inc.",
  phone: "800-998-9938"
});
      
new_book_id = uuid();
db.books.push({
  id: new_book_id,
  name: "Bash Pocket Reference",
  date: "2010-05-01",
  isbn: "987-1-449-38788-4",
  author: new_author_id,
  publisher: new_publisher_id,
});

// save all of our changes atomically.

db.save();

// we could re-arrange and add "index objects" for quick lookups by name, etc.

// later we will show how to have the Object DB automatically maintain index
// objects for you, but this illustrates the concept.
db.authors = { list: db.authors };
db.authors.by_id = make_index(db.authors.list, "id");
db.authors.by_name = make_index(db.authors.list, "name");

function make_index(list, key) {
  "use strict";
  var i = 0;
  var index = {};
  for (; i < list.length; i++) {
    if (list[i] && list[i][key]) {
      if (!index[list[i][key]]) {
        index[list[i][key]] = [];
      }
      index[list[i][key]].push(i);
    }
  }
}



db.save();

// Anyway, the basic idea is just that you persist data by way of using
// objects very close to the ways they exist naturally.
// The Object DB's job is to efficiently handle storage, updates, caching, etc.
// for you.
```

Cryptographically, changes to the object database are batched into transactions
(more on transactions below) and streamed to the server as records.  Each
record updates the state of the database in a specific way.  The current state
is the combined effects of all records.  

(We're ignoring issues of compaction and garbage collection for now.)

## The Object Database is Subdivided with Containers

A typical object database involves a single root level object.

With Crypton, the database is subdivided into what we call "containers."

Basically, each container is an independent or interdependent part of the
database.  It can be retrieved, updated, deleted, securely shared and unshared
with peers independently of other parts of the database.

Each container has a name -- a string of arbitrary length.  Container names are
stored server side as the result of a keyed HMAC, so the server does not know
the application level names of the container.

You can think of the many containers as a key-value store -- except that the
values are rich.  They can be structured data that evolves over time, updated,
and has automatic histroy.

## Containers Are Cheap: Use them Early and Often

Creating, retrieving, caching, and storing new containers is inexpensive.  It's
often conceivable and appropriate for an application to have hundreds of
thousands of containers for a single user.  This lets us use containers for a
variety of useful purposes that we will explore throughout this document.

## Organizing Containers to Reduce Load Time: Metadata and Data

To access the current objects in a container, every record must be retrieved
from the server and processed in order to build up the end state of the
container.  The framework will do some automatic caching such that only new
records need to be retrieved.

For expediting application load times when no local cache is available, a
useful strategy is to arrange containers in a "drill down" fashion, with meta
data separate from data.

For example, let's consider a simple journal application and the containers it
might use.  This journal application is intended for data to be private to a
single account (in other words, articles aren't shared with other users of the
application.)  Journal entries have a, date, subject, and content.  The content
is rich text and may optionally have inline attachments (such as documents,
pictures, audio, or video.)

We'll use a container called "journal_entries" to store the metadata of all
journal entries: date, subject, and entry_id.  We'll then use one container per
article called something like "journal_entry.content.entry_id."  That entry
will have the actual article content (the text.)  We might separate things
further and have other containers for the attachments to each entry.

The benefits of this approach are near instant application loading.  When a
user first logs in, even with an empty cache, the only thing they have to load
immediately to begin interacting with the system is the metadata
"journal_entries" container.  Its contents are so minimal that even if save a
new article every day for 10 years, it will still load quickly.  You can
provide results for searches on titles from this container only.

For each article that the user interacts with specifically, drilling down into
it the data, it's one or two additional container loads for content and
attachments.  Those should also be quick since we're not loading anything
extra.

See below for additional uses of containers--for example to implement search on
the contents of each journal entry.

## Containers are Sharable and Unsharable

A container in sharable with one or more accounts.  (Technically, a container
is always shared with at least one account -- the creator!)  

This is accomplished just by calling the .share method of a container.  

Containers have session keys for encrypting individual records.  Sharing works
by encrypting these session keys to the public keys of the accounts the
container is shared with.  When a container is unshared (meaning that some
account should no longer be able to read records in it), then the session key
is rotated.  Rotation happens by creating a new session key, and encrypting it
to the public keys of all the accounts who should continue to be able to read
the container.

What if you have a private journal with many entries in it, and you want to
share some (but not all) of those entries with another user?  Make a "derived
container" 

## Container Names are Unknown to the Server

The server does not know the names of the containers you store.  Therefore it
is safe to store containers with names that are meaningful and representative
of their content.  For example: "journal_entry_1234_attachments"

When you create a new container, the name of the container the server sees is
actually a keyed SHA256 HMAC of the name the creator supplied.  The HMAC is not
reversible, and uses a HMAC key that was created during account generation.
This means that two users who create a container with the same given name, do
not have those containers stored with the same HMAC of the name.

However, this means that some special effort is required in order to be able to
ask the server for a list of all containers you have stored.  The server could
give you such a list, but not the original (unhashed) names.  At the moment
this is an unaddressed limitation -- it's up to the application to keep track
of container names.

## "Index" or "Materialized View" Containers

This feature is not yet implemented in Crypton but is near on the development
roadmap, and discussing it is useful to illustrate how some rich features (such
as searching, sorting, and general data aggregation) can be implemented in a
zero knowledge application.

It's also possible to implement similar behavior in application level logic,
even before the framework has plugins to do this automatically for you.

Let's suppose we have an application that's a very large knowledge base with
1,000,000 articles.  Average article length is 5000 words, for a total of
5,000,000,000 words across all articles.

We've already seen how we can efficiently implement "title search" across this
large collection of articles by separating metadata from data in different
containers.  Now we want to implement search across the content of the articles
themselves -- not just the metadata, but search inside the actual data.

We have 5 gigawords of article content.  Brute force search (loading every
article's content and examining it for desired keywords) would be very slow and
incur tremendous network IO.

The solution is to precompute an index and store it efficiently using
containers.  A simple solution might be to have a container for every word in
the lexicon.  (We're ignoring issues like stemming for the moment.)  The data
in each word-specific container is a list of references to articles that
include the word.  So when a search happens, we load the word specific
containers for each keyword.  Then we load just the articles that mentioned as
references for those words.

Note that we don't have to plan this feature before we start using it.  We
don't have to have indexes established from the beginning.  The index just has
to be computed once before it can be used--this can be any time in the
product's development--and maintained afterwards.

Future versions of Cryption will have plugins to do this sort of index
calculation transparently, atomically maintaining "index containers" for you
every time your source objects are saved.  There will be a few standard types
of indexers bundled with the framework (such as for natural language search, as
discussed here) and hooks for adding new indexers at the application level.

## Binary Large Object Data Storage (BLOBs)

TODO.  This early version of Crypton only supports valid JSON in the Object
Database.  That's not very efficient for binary storage (pictures, music,
video, etc.)

At the moment the only option is storing binary strings as base64, which
requires extra work and inflates their size.

## Realtime Private Application Messages between Accounts

To support message based application design, Crypton make is possible for an
application one user account to request to add a message to the "inbox" of
another user account (including the author.)

To be clear, these are application level messages -- messages between programs
-- not messages between humans.  The message might mean something like: I've
shared a new container with you--go check it out.  A chat application might
exclusively use messages.

Messages can have a header (limited to 4k) and a payload.  There's an optional
time-to-live for specifying that a message only has transient value.  Both are
encrypted.

Other application users retrieve the messages in their inbox by polling or
receiving realtime notifications.

TODO details

## Transactions Allow Complex Atomic Updates

You can create a transaction that makes many changes as an indivisible unit.
This is similar to a relational database with ACID properties: the full
collection of changes will either complete entirely or fail entirely.

This means you can make changes across one or more containers and guarantee
consistency.  In addition to creating, modifying, and deleting any number of
containers, you can also share and unshare containers, and create and delete
messages. 

## Container Versioning, Merging Changes, and Container Refresh

Let's suppose you're using the Crypton journal application discussed above, and
you've been editing two new entries -- one on your laptop and another on your
phone.  You hit save on both of them at about the same time, and the network
arranges that both operations reach the server at nearly the same instant.

In a relational database, the server can handle these two operations
independently without complication.  The server arranges the primary key ID
numbers for example, so both inserts can get sequential IDs without conflicts.

In Crypton, only the client can read the contents of a container so the server
cannot help.  To avoid conflicting updates resulting in a corrupted container,
there's one simple rule: in order to update a container, you have to know the
version ID of the latest record already in the container.

When you (or the framework on your behalf) send a transaction to the server,
along with each container you wish to modify, behind the scenes the framework
is telling the server "I know about record version ID N in this container."
The server will refuse to apply the transaction if the version ID specified is
not the ID of the most recent record in that container.  The server will
instead respond with a conflict message, telling the framework specifically
which containers it needs to refresh.

The framework then refreshes those container(s), receiving just the new records
from the server.  Often the framework can often resolve the situation and
reform the transaction in much the same way the relational database would.  In
some rare cases, the framework will not be able to resolve the conflict
automatically, and will report commit failure to the application.  This
possibility can be eliminated by data structure choices.  In any case, the
framework will report which containers have changed, and have the new contents
of those containers available.

## Containers Have History

Since containers are created as a stream of records, this effectively means
that they have history built into the storage medium, allowing a container's
state to be observed as of a point in time.

(History might be removed after a container is compacted, however.)

## Container Organization Approaches for Various Situations

There's as many ways to lay out containers as there are types of applications
that use them.  I think if we go through a few examples, common tactics and
strategy will emerge.

### Personal Journal

Discussed Above

### Collaborative Whiteboard

Alice and Bob wish to share a collaborative whiteboard where they can privately draw silly pictures of cats.

We can think of the whiteboard as a canvas with point coordinates.  All
coordinates start out white.  By default, Alice makes makes marks in red and
Bob makes marks in blue.

Alice open the application and creates a new whiteboard.  Like in the journal
application, we're separating metadata from data.  So the existence of this
whiteboard, along with meta information like the date and a title, is stored in
a listing container.  There's another container for the content of just this
one whiteboard.

Alice shares her whiteboard container with Bob.  She sends an application level
message to bob telling him this whiteboard exists along with its name.

Bob's application receives the notification that Alice has shared a new
whiteboard with him.  He choses to collaborate.  The application automatically
adds a new whiteboard entry to bob's meta container, and starts a new container
for this whiteboard.  He shares this container with Alice, and sends her
application message telling her the reciprocal container he has shared.

Alice's application watches Bob's container for changes.  Bob's application
watches Alice's container for changes.  Both receive realtime events with the
new records either creates in their own containers.

On Alice's screen, she sees a series of drawing tools (pencil, eraser, text
type, etc) she can use to modify the whiteboard.  Each modification she makes
becomes a new record stored to her container, describing the drawing mark she
made.  

On Bob's screen, his application is watching Alice's shared container, and
draws each of her marks as they are received.  Bob draws his own marks and
Alice sees blue.

Every event put into the containers has some meta information along with it: an
ID, a timestamp, and the ID most recent mark the application was aware of
before this one.  These allow simple cases where both people are drawing on the
same coordinates at once to be sorted out automatically.  Erasing is just
another kind of mark, drawn with white instead of red or blue.  Sophisticated
marks (typography, etc.) are stored as either pure vectors or if necessary
vectors with rasterized portions.

What's significant in this approach is that Bob and Alice don't need to write
to each others' containers.  There's no read/write access controls needed.  On
top of simple, two way real time sharing, we've built a collaborative tool.
Alice and Bob can each have private whiteboards available only to themselves,
and those they share with others.

### File and Backup Service

Alice wants to backup her large collection of files.  This includes millions of
lines of  of source code (she's a developer for LibreOffice and a reviewer for
Apache Software.)  Also there's her extensive collection of old school funk,
euro trance music, and of course those grand kid pics.

Alice wants to be able to login to her online file manager and immediately
start browsing her files, much like she would in her operating system, quickly
opening folders and subfolders, drilling down until she finds just the right
track for  afternoon freestyle breakdancing.

How might we arrange the containers to support this user behavior?  Can we use
the metadata trick again?  Of course!  Here's a simple structure we could start
with:

 1. One container (maybe called a folder_tree) just records a map of the paths
    of folders.  I.e., which folders exist, what their paths are, and a
    reference to another container for their contents.  We store this as a
    dictionary with all paths flattened and specified absolutely.  I.e.
    "C:\Users\Alice\Documents\Music\Euro\" maps to the name of a container that
    has the metadata for the contents of that folder.

 2. We use one container per folder for the files (everything but folders,
    really) inside that particular folder.  Again, we only store the metadata
    about these files.  We store references to other containers for the bulky
    binary contents.

 3. We use one container per unique file for binary content.  We might name
    these based on a sha256 hash of their content to get file level
    deduplication.

This arrangement lets us present Alice with a very interactive experience.
When she first logs into the online file manager, she can very quickly retrieve
one small container and see the hierarchy of folders.  She can navigate and
open any folder, causing another small container retrieve to see that one
folder's contents.  Downloading any particular file retrieves a container with
just that data in it.

### Hybrid Full / Zero Knowledge Zombie Coloring Book

This is like the collaborative whiteboard app, but probably has a different
collection of drawing colors and tools (blood, brains, etc.)

It involves a combination of full-knowledge server supplied data (the uncolored
pages of the coloring book as vectors) and zero knowledge user data (the
coloring that the user does with them.)

Alice might select an attractive zombified scene from a full knowledge gallery,
supplied by the server.  The server provides a detailed vector for that page
from the coloring book.  Alice creates a metadata entry for it, and a container
for her drawing actions.  She colors in the drawing by adding a series of draw
events to her container.  Eww.  Gross.

## Tour of Server Side Storage

The best place to understand this in detail is reading the well commented
schema.

However, let's do a quick tour of just concepts.  In the reference
implementation, we give Crypton's Object Database it's ACID properties by
backing it server side with our favorite relational database: PostgreSQL 9.2.
Alternative database technologies would also work, but we have taken care in
the design to make the relational database schema easily shardable and thus
horizontally scalable.

Let's give a quick tour of the server side storage and database schema.

Users have accounts.  Accounts have a base_keyring which stores their
asymmetric keys, various HMAC keys, and salts.  Some of these are encrypted to
a key derived from their passphrase and salt.

Application users store their data in the Object Database, in zero or more
containers.  

The existence of those containers is stored in the container table.  That table
does not store the keys to the containers, who they might be readable by, or
any actual data going into the data.  The container's data is found in a series
of records added to the container over time.  Each record changes the state of
the container from the previous record.  Records are encrypted with session
keys, so we first need to discuss how those container session keys are stored.  

The existence of container session keys (again, not the key itself) is stored
in container_session_key table.  The actual keys are stored in the
container_session_key_share table, encrypted to the public key of the account
the session key should be readable by.  In other words, there's a one:many
relationship between session keys and session key shares.  A session key will
always be shared to at least one account (the author) because otherwise this
would be a write only storage medium.

As of this writing, the records in containers directly contain the binary data
from the record itself (taking advantage of PosgreSQL's BLOBs and TOAST.)
Future implementations will make this pluggable, so the bulky binary parts
maybe stored external to the database.  Plugins will include
https://nimbus.io/, Amazon S3, the file system, etc.

There are also tables for application level messages, and for application
transactions.  Transactions allow modifying multiple containers and messages
atomically.  Transactions are created, built up to include one or more changes,
and then either committed or aborted.  

## Application Deployment, Distribution, and Threat Models

There are a variety of ways Crypton applications might be developed, packaged,
deployed, and hosted.  

Here are example scenarios, some of which could happen in combination:

 1. Carol builds an applications that stores storing data via a Crypton storage
    servers operated by Carol.
 2. Like above, except Carol's uses a Crypton SDK provided by SpiderOak.  Data
    is stored inside end-user SpiderOak accounts on SpiderOak servers.
 3. Carol distributes her application in the form of pre packaged, signed,
    verifiable open source desktop and mobile applications.
 4. Carol makes her application browser based, and serves the application code
    from servers controlled by Carol.
 5. Like above, except Carol works with a trusted hosting provider Trent to
    host and serve the web application source code.  Trent certifies the source
    code.



## Container Compaction, Garbage Collection

## Crypton's Internal Containers

The framework will create some internal use containers who's names begin with 

"__crypton_internal.beb3e1a4c60573442c3fc337d15d069cacbefa39ba9a1d09efabb08ff1e77a05."
Don't give your own containers names starting with that.  (You don't need to
worry about this.)

Internal containers might be used for a variety of purposes, such as keeping
track of the real names of the containers your application actually uses,
compaction and garbage collection history, and other meta.

## Listing and Deleting Containers

## Server Deployment

## Server Scaling





