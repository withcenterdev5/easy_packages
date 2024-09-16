# Easy Comment

This `comment_package` offers a powerful and simple way to add comment functionality to your app. It's versatile, perfect for things like post comments, product reviews, or photo feedback.

The `comment_package` offers a complete set of UI/UX widgets and logics for managing comments. This includes widgets for creating, updating, deleting, and listing comments, as well as for upload, likes, and much more.

# Terms

- `First level comments` are comments made(created) directly under a post.


# TODOs

- Use Realtime Database for Comment Listing.
  - Mirror the content, uid, first photo, createdAt of the comment of the post into Realtime Database.
  - This is for reducing the cost.
  - The Firestore will hold data for keeping original data and filtering purpose.



# Database Structure of Comment

Initially, we considered using the Realtime Database for comments. However, since comments are needed for various parts of the app, not just posts, we require something more flexible. Therefore, Firestore is a better choice than the Realtime Database.

- `/comments/{commentId}` is the collection and document to store comments.

- To get the `first level comments`, you can use one of the following condition.

  - condition: if `parentId is empty`, then it's the first level comment.
  - condition: if `depth=0`.

- `documentReference` is the document of the comment belongs to.

  - If it is a reference of a user document. Then the comments that has the same documentReference ar the comments of the user. You may set it as a review feature of user's public profile.
  - This doucment reference can be any document reference. It can be a online shopping mall's product item document, or any thing.

- `hasChild` field becomes true when the comment has a child.

  - It is not saved in the database, and is set inside clident side.
  - it is only available when the comments are transformed with `CommentService.instance.fromQuerySnapshot` method.
  - `hasChild` is used for sorting and displaying purpose.

- `deleted` is set to true if the comment is deleted. It is false by default. So, you can filter comments that are not deleted.

# Widgets

## CommentInputBox

This is a simple comment create widget.

```dart
CommentInputBox(
  parent: comment,
),
```

```dart
SliverToBoxAdapter(
  child: CommentFakeInputBox(
    onTap: () => CommentService.instance.showCommentEditDialog(
      context: context,
      documentReference: ref,
      focusOnContent: true,
    ),
  ),
),
```

## Displaying comments

The `easy_comment` provides two list view widgets for displaying comments.

You can copy the code from `easy_comment` and build your own comment list view widget for different UI/UX,

### CommentListView

The first one is `CommentListView`. This is similar two `ListView`.

You can use `CommentListView` like below to display the comments.

```dart
CommentListView(
  documentReference: ref,
  shrinkWrap: true,
  physics: const NeverScrollableScrollPhysics(),
  itemBuilder: (comment, index) =>
      CommentListDetail(comment: comment),
),
```

For the `itemBuilder`, you may use one of `CommentDetail`, `CommentListDetail`, `CommentListArrowDetail`, or `CommentListVerticalLineDetail`. Or you can copy the code and build your own.

Example: Below is an example of using the available widgets.

```dart
CommentListView(
  documentReference: ref,
  itemBuilder: (comment, index) {
    return CommentListDetail(comment: comment); // default
    return CommentListArrowDetail(comment: comment); // arrow style comment
    return CommentListVerticalLineDetail(comment: comment); // vertical line comment
  },
),
```

### CommentListTreeView

`CommentListTreeView` provides a nice tree style vertical lines on the nested comment list. It is designed to work in sliver scroll view. So, you should use `CustomScrollView` on the screen.

```dart
SliverToBoxAdapter(
  child: CommentFakeInputBox(
    onTap: () => CommentService.instance.showCommentEditDialog(
      context: context,
      documentReference: task.ref,
      focusOnContent: true,
    ),
  ),
),
CommentListTreeView(documentReference: task.ref),
```

# onCreate CallBack

The `onCreate` is a callback after the comment is created.
You can use this callback to do something comment post is created.

Usage: (e.g. send push notification to ancestor uid)

In the example below, we can send push notification to ancestor uid after the comment is created. It contains the newly created `comment` information.

First we get the ancestor uids after the comment is created, then we send a push notification to the ancestor uids.

```dart
    CommentService.instance.init(
      onCreate: (Comment comment) async {
        /// get ancestor uid
        List<String> ancestorUids =
            await CommentService.instance.getAncestorsUid(comment.id);
        /// get post information
        Post post = await Post.get(comment.documentReference.id);
        if (myUid != null && post.uid != myUid) {
          ancestorUids.add(post.uid);
        }

        if (ancestorUids.isEmpty) return;

        /// set push notification to remaining uids
        /// can get comment or post to send more informative push notification
        MessagingService.instance.sendMessageToUids(
          uids: ancestorUids,
          title: 'title ${DateTime.now()}',
          body: 'ancestorComment test ${comment.content}',
          data: {
            "action": 'comment',
            'commentId': comment.id,
            'postId': comment.documentReference.id,
          },
        );
      },
    );
```

# Development Tips

## Testing

```dart
import 'package:easy_comment/easy_comment.dart';
import 'package:easy_post_v2/easy_post_v2.dart';
import 'package:easyuser/easyuser.dart';
import 'package:flutter/material.dart';

class CommentTestScreen extends StatefulWidget {
  static const String routeName = '/CommentTest';
  const CommentTestScreen({super.key});

  @override
  State<CommentTestScreen> createState() => _CommentTestScreenState();
}

class _CommentTestScreenState extends State<CommentTestScreen> {
  @override
  Widget build(BuildContext context) {
    // final ref = my.ref;
    // final ref = Post.col.doc('1zsZ2YMplgZN6D6bdZIn');
    // final ref = Post.col.doc('0-console');
    // final ref = Post.col.doc('0-console-2');
    // final ref = Post.col.doc('0-con-3');
    // final ref = Post.col.doc('0-a');
    // final ref = Post.col.doc('0-b');
    // final ref = Post.col.doc('0-c');
    final ref = Post.col.doc('0-4');
    return Scaffold(
      appBar: AppBar(
        title: const Text('CommentTest'),
      ),
      body: Padding(
        padding: const EdgeInsets.fromLTRB(24.0, 24, 24, 0),
        child: MyDocReady(
          builder: () => ListView(
            padding: const EdgeInsets.all(0),
            children: [
              Text('Reference: ${ref.path}'),
              const SizedBox(height: 24),
              CommentFakeInputBox(
                onTap: () => CommentService.instance.showCommentEditDialog(
                  context: context,
                  documentReference: ref,
                  focusOnContent: true,
                ),
              ),
              CommentInputBox(
                documentReference: ref,
              ),
              CommentListView(
                documentReference: ref,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemBuilder: (comment, index) =>
                    CommentListArrowDetail(comment: comment),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: CommentFakeInputBox(
          onTap: () => CommentService.instance.showCommentEditDialog(
            context: context,
            documentReference: ref,
            focusOnContent: true,
          ),
        ),
      ),
    );
  }
}
```
