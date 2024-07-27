import 'package:easy_comment/easy_comment.dart';
import 'package:easy_helpers/easy_helpers.dart';
import 'package:easy_like/easy_like.dart';
import 'package:easy_locale/easy_locale.dart';
import 'package:easy_post_v2/easy_post_v2.dart';
import 'package:easy_post_v2/src/widgets/post.detail.photos.dart';
import 'package:easy_post_v2/src/widgets/post.detail.youtube_meta.dart';
import 'package:easyuser/easyuser.dart';
import 'package:flutter/material.dart';

/// This widget that contains the overall details of the post
/// contains youtube video, youtube meta data, post title, post content , post photos
///
/// [post] is the post model(document) object and it is updated in realtime.
class PostDetail extends StatefulWidget {
  /// `post` this contains the post inforamtion
  ///
  /// `youtube` for youtube player,this use to pass the youtube player comming from the
  /// `YoutubeFullscreenBuilder` to be reused if this widget is not provide it will
  /// use a new youtube player
  const PostDetail({super.key, required this.post, this.youtubePlayer});

  final Post post;
  final Widget? youtubePlayer;

  @override
  State<PostDetail> createState() => _PostDetailState();
}

class _PostDetailState extends State<PostDetail> {
  Post get post => widget.post;
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        UserDoc(
          uid: post.uid,
          builder: (user) {
            return user == null
                ? const SizedBox.shrink()
                : Row(
                    children: [
                      UserAvatar(
                        user: user,
                      ),
                      const SizedBox(
                        width: 16,
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(user.displayName),
                            Text('${user.createdAt}'),
                          ],
                        ),
                      )
                    ],
                  );
          },
        ),
        const SizedBox(height: 16),
        UserBlocked(
          otherUid: post.uid,
          builder: (blocked) {
            if (blocked) {
              return const SizedBox(
                width: double.infinity,
                height: 200,
                child: Center(
                  child: Text('This user has been blocked.'),
                ),
              );
            }
            return Column(
              children: [
                if (post.deleted) ...{
                  const SizedBox(
                    width: double.infinity,
                    height: 200,
                    child: Center(
                      child: Text('This Post has been deleted.'),
                    ),
                  ),
                } else ...{
                  if (post.hasYoutube && widget.youtubePlayer != null)
                    widget.youtubePlayer!,
                  PostDetailYoutubeMeta(post: widget.post),
                  PostDetailPhotos(post: widget.post),
                  const SizedBox(height: 16),
                  Text(post.title),
                  Text(post.content),
                },
              ],
            );
          },
        ),
        Row(
          children: [
            TextButton(
              onPressed: () {
                CommentService.instance.showCommentEditDialog(
                  context: context,
                  documentReference: post.ref,
                  focusOnContent: false,
                );
              },
              child: Text('Reply'.t),
            ),
            TextButton(
              onPressed: () async {
                final like = Like(uid: my.uid, documentReference: post.ref);
                await like.like();
              },
              child: Text(
                'Like'.tr(args: {'n': post.likeCount}, form: post.likeCount),
              ),
            ),
            const Spacer(),
            PopupMenuButton<String>(
              itemBuilder: (_) => [
                if (post.isMine)
                  PopupMenuItem(
                    value: 'edit',
                    child: Text('Edit'.t),
                  ),
                if (post.isMine)
                  PopupMenuItem(
                    value: 'delete',
                    child: Text('Delete'.t),
                  ),
                PopupMenuItem(
                  value: 'report',
                  child: Text('Report'.t),
                ),
                PopupMenuItem(
                  value: 'block',
                  child: UserBlocked(
                    otherUid: post.uid,
                    builder: (blocked) =>
                        Text(blocked ? 'Unblock'.t : 'Block'.t),
                  ),
                ),
              ],
              child: const Icon(Icons.more_vert),
              onSelected: (value) async {
                if (value == 'edit') {
                  PostService.instance.showPostUpdateScreen(
                      context: context, post: widget.post);
                } else if (value == 'delete') {
                  final re = await confirm(
                    context: context,
                    title: 'Delete'.t,
                    message: 'Are you sure you wanted to delete this post?'.t,
                  );
                  if (re == false) return;
                  await post.delete();
                } else if (value == 'report') {
                  // await ReportService.instance.showReportDialog(
                  //   context: context,
                  //   documentReference: post.ref,
                  // );
                } else if (value == 'block') {
                  // await i.block(post.uid) BlockService.instance.showBlockDialog(
                  //   context: context,
                  //   documentReference: post.ref,
                  // );

                  await i.block(context: context, otherUid: post.uid);
                }
              },
            ),
          ],
        ),
      ],
    );
  }
}
