/**
 * Welcome to janky-town. This code is messy as shit.
 *
 * The point of this code is to populate the sidebar on the nimbuskit.info homepage with events
 * from the Nimbus Github stream.
 */

var GitHubAPI = {};

GitHubAPI.Repo = function(username, reponame, callback) {
  requestURL = "https://api.github.com/repos/"+username+"/"+reponame+'?callback=?';
  $.getJSON(requestURL, function(json, status){
    callback(json.data, status);
  });
};
GitHubAPI.RepoEvents = function(username, reponame, callback) {
  requestURL = "https://api.github.com/repos/"+username+"/"+reponame+"/events?callback=?";
  $.getJSON(requestURL, function(json, status){
    callback(json.data, status);
  });
};
GitHubAPI.RepoIssues = function(username, reponame, labels, callback) {
  requestURL = "https://api.github.com/repos/"+username+"/"+reponame+'/issues?labels='+labels+'&callback=?';
  $.getJSON(requestURL, function(json, status){
    callback(json.data, status);
  });
};
GitHubAPI.RepoContributors = function(username, reponame, callback) {
  requestURL = "https://api.github.com/repos/"+username+"/"+reponame+'/contributors?callback=?';
  $.getJSON(requestURL, function(json, status){
    callback(json.data, status);
  });
};
function normalizeDate(date) {
  var relative_to = new Date();
  var delta = parseInt((relative_to.getTime() - date.getTime()) / 1000);

  var out = '';
  if (delta < 60) {
    out = 'a minute ago';
  } else if(delta < 120) {
    out = 'couple of minutes ago';
  } else if(delta < (45*60)) {
    out = (parseInt(delta / 60)).toString() + ' minutes ago';
  } else if(delta < (90*60)) {
    out = 'an hour ago';
  } else if(delta < (24*60*60)) {
    out = '' + (parseInt(delta / 3600 + 0.5)).toString() + ' hours ago';
  } else if(delta < (48*60*60)) {
    out = '1 day ago';
  } else {
    out = (parseInt(delta / 86400)).toString() + ' days ago';
  }

  return out;
}

function fetchIssues(type, element, label) {
  var labels = type;
  element.attr('href', 'http://github.com/jverkoey/nimbus/issues?labels='+labels);
  GitHubAPI.RepoIssues('jverkoey', 'nimbus', labels, function(json, status) {
    if (json) {
      var text = json.length;
      element.html(label + ' ' + text);
    }
  });
}

$(document).ready(function(){
  GitHubAPI.Repo('jverkoey', 'nimbus', function(json, status) {
    var r = $('#repo');
    r.empty();

    var bugs = $('<dd>');
    var requests = $('<dd>');
    r.append($('<dl>')
      .append($('<dd>').html('Forks: '+json.forks))
      .append($('<dd>').html('Watchers: '+json.watchers))
      .append(bugs)
      .append(requests)
    );
    
    fetchIssues('bug', bugs, 'Bugs:');
    fetchIssues('feature', requests, 'Feature Requests:');
  });

  GitHubAPI.RepoContributors('jverkoey', 'nimbus', function(json, status) {
    var c = $('#contributors');
    c.empty();

    for (var i in json) {
      var u = json[i];
      c.append(
        $('<div>').addClass('contributor_profile')
        .append(
          $('<img>').attr('src', 'http://www.gravatar.com/avatar/'+u.gravatar_id+'?s=134')
        ).append($('<div>').addClass('github')
                 .append($('<a>').attr('href', 'http://github.com/'+u.login).html(u.login)
                 )
        )
      );
    }
  });

  GitHubAPI.RepoEvents('jverkoey', 'nimbus', function(json, status) {
    var l = $('#latest');
    l.empty();

    var eventMap = {
      'PushEvent': {
        'img':'up.png'
      }
    };

    var dl = $('<dl>');
    dl.append($('<div>').addClass('spacer'));

    for (var i in json) {
      if (i > 8) {
        break;
      }
      var e = json[i];
      var date = new Date(e.created_at);
      var relDate = normalizeDate(date);

      var baseUrl = 'https://github.com/'+e.repo.name+'/';

      var avatar = $('<img>')
        .addClass('avatar')
        .attr('src', 'http://gravatar.com/avatar/'+e.actor.gravatar_id+'?s=16')
        .attr('valign', 'middle');

      var when = $('<dd>')
          .attr('title', date.toString())
          .append(relDate);

      var didCreate = true;
      var row = $('<div>');
      row.attr('data-placement', 'left');

      if (e.type == 'PushEvent') {
        row.append($('<dt>')
          .append(avatar)
          .append(e.actor.login+' pushed to '+e.payload.ref.replace('refs/heads/', ''))
        );
        row.append(when
          .append(' - ')
          .append($('<a>')
            .attr('href', baseUrl+'commit/'+e.payload.head)
            .html('ref')
          )
        );

        row.attr('title', e.actor.login+' pushed to '+e.payload.ref.replace('refs/heads/', ''));
        var html = '<dl>';
        for (var commitindex in e.payload.commits) {
          if (commitindex > 3) {
            html += '<dt>...</dt>';
            break;
          }
          var commit = e.payload.commits[commitindex];
          var msg = commit.message;
          if (msg.length > 50) {
            msg = msg.substr(0, 50)+'...';
          }
          html += '<dt>'+msg+'</dt>';
          html += '<dd>Committed by: '+commit.author.name+'</dd>';
        }
        html += '</dl>';
        row.attr('data-content', html);

      } else if (e.type == 'WatchEvent') {
        row.append($('<dt>')
          .append(avatar)
          .append(e.actor.login+' is watching')
        );
        row.append(when);

      } else if (e.type == 'GollumEvent') {
        var page = e.payload.pages[0];
        row.append($('<dt>')
          .append(avatar)
          .append(e.actor.login+' '+page.action+' ')
          .append($('<a>')
            .attr('href', page.html_url.replace('https://github.com/jverkoey/nimbus/wiki/', 'http://wiki.nimbuskit.info/'))
            .html('a wiki page'))
        );
        row.append(when);

        row.attr('title', e.actor.login+' '+page.action+' '+page.title);

      } else if (e.type == 'ForkEvent') {
        row.append($('<dt>')
          .append(avatar)
          .append(e.actor.login+' forked ')
          .append($('<a>')
            .attr('href', e.payload.forkee.html_url)
            .html('nimbus'))
        );
        row.append(when);

      } else if (e.type == 'CreateEvent') {
        // Ignored.
          didCreate = false;

      } else if (e.type == 'DeleteEvent') {
        // Ignored.
          didCreate = false;

      } else if (e.type == 'IssueCommentEvent') {
        row.append($('<dt>')
          .append(avatar)
          .append(e.actor.login+' commented on ')
          .append($('<a>')
            .attr('href', baseUrl+'issues/'+e.payload.issue.number+'#issuecomment-'+e.payload.comment.id)
            .html('#'+e.payload.issue.number)
          )
        );
        row.append(when);

        row.attr('title', e.payload.issue.title);
        var body = e.payload.comment.body;
        if (body.length > 100) {
          body = body.substr(0, 100)+'...';
        }
        row.attr('data-content', '<strong>'+e.actor.login+' commented:</strong><br/><pre>'+body+'</pre>');

      } else if (e.type == 'PullRequestEvent') {
        row.append($('<dt>')
          .append(avatar)
          .append(e.actor.login+' '+e.payload.action+' pull ')
          .append($('<a>')
            .attr('href', baseUrl+'pull/'+e.payload.pull_request.number)
            .html('#'+e.payload.pull_request.number)
          )
        );
        row.append(when);

        row.attr('title', e.payload.pull_request.title);
        var body = e.payload.pull_request.body;
        if (body.length > 100) {
          body = body.substr(0, 100)+'...';
        }
        if (body.length > 0) {
          row.attr('data-content', '<pre>'+body+'</pre>');
        } else {
          row.attr('data-content', 'No message included.');
        }

      } else if (e.type == 'IssuesEvent') {
        row.append($('<dt>')
          .append(avatar)
          .append(e.actor.login+' '+e.payload.action+' issue ')
          .append($('<a>')
            .attr('href', baseUrl+'issues/'+e.payload.issue.number)
            .html('#'+e.payload.issue.number)
          )
        );
        row.append(when);

        row.attr('title', e.payload.issue.title);
        var body = e.payload.issue.body;
        if (body.length > 100) {
          body = body.substr(0, 100)+'...';
        }
        if (body.length > 0) {
          row.attr('data-content', '<pre>'+body+'</pre>');
        } else {
          row.attr('data-content', 'No message included.');
        }


      } else {
        didCreate = false;
      }

      dl.append(row);

      row.popover({
        offset: 10,
        html: true
      });

      if (didCreate) {
        dl.append($('<div>').addClass('spacer'));
      }
    }
    l.append(dl);
  });
});
